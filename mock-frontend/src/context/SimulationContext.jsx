import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { fetchRouteGeometry } from '../services/routing';
import eventBus from '../mock/eventBus';

const SimulationContext = createContext(null);

const SEGMENT_SPEEDS = {
  truck: 0.0005,
  ship: 0.0003,
  plane: 0.002,
};

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CARRIER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];

function interpolate(from, to, fraction) {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

function computeSteps(geometry, transportMode) {
  const speed = SEGMENT_SPEEDS[transportMode] || SEGMENT_SPEEDS.truck;
  const totalDist = geometry.reduce((sum, p, i) => {
    if (i === 0) return 0;
    return sum + Math.sqrt((p.lat - geometry[i - 1].lat) ** 2 + (p.lng - geometry[i - 1].lng) ** 2);
  }, 0);
  return Math.max(10, Math.floor(totalDist / speed));
}

export function SimulationProvider({ children }) {
  const [simMode, setSimMode] = useState(false);
  const [waypoints, setWaypoints] = useState([]);
  const [previousSegments, setPreviousSegments] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [currentSimIndex, setCurrentSimIndex] = useState(0);
  const [simParcelId, setSimParcelId] = useState(null);
  const [simCompletedFor, setSimCompletedFor] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const speedRef = useRef(1);
  speedRef.current = speed;
  const timerRef = useRef(null);
  const osrmTimerRef = useRef(null);

  useEffect(() => {
    if (osrmTimerRef.current) clearTimeout(osrmTimerRef.current);
    if (waypoints.length < 2) {
      if (previousSegments.length === 0) setRouteGeometry([]);
      return;
    }
    osrmTimerRef.current = setTimeout(async () => {
      const geo = await fetchRouteGeometry(waypoints);
      if (geo.length > 0) setRouteGeometry(geo);
    }, 500);
    return () => { if (osrmTimerRef.current) clearTimeout(osrmTimerRef.current); };
  }, [waypoints, previousSegments.length]);

  const toggleMode = () => setSimMode((m) => !m);

  const loadSimulationSegments = useCallback((trackingNumber, carrierId) => {
    setPreviousSegments([]);
    setWaypoints([]);
  }, []);

  const completeSimulation = useCallback((trackingNumber, carrierId, parcelId, finalPoint, path) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setSimulating(false);
    setSimParcelId(null);
    setSimCompletedFor(parcelId);

    if (path && path.length >= 2) {
      setRouteGeometry(path);
    }

    if (parcelId && finalPoint) {
      eventBus.emit('location:update', {
        parcelId,
        lat: finalPoint.lat,
        lng: finalPoint.lng,
        carrierId: carrierId || undefined,
        carrierName: 'Simulation',
      });
    }

    if (trackingNumber && carrierId) {
      setPreviousSegments((prev) => {
        const alreadyThere = prev.find((s) => s.carrierId === carrierId);
        if (alreadyThere) return prev;
        return [...prev, {
          carrierId,
          carrierName: 'Carrier',
          color: CARRIER_COLORS[prev.length % CARRIER_COLORS.length],
          waypoints: path,
          routeGeometry: path || routeGeometry,
          status: 'completed',
        }];
      });
    }
  }, []);

  const addWaypoint = (lat, lng, transportMode = 'truck') => {
    const offset = previousSegments.reduce((sum, s) => sum + s.waypoints.length - 1, 0);
    const label = LABELS[waypoints.length + offset] || LABELS[LABELS.length - 1];
    setWaypoints((prev) => [...prev, { label, lat, lng, transportMode }]);
  };

  const updateWaypoint = (index, updates) => {
    setWaypoints((prev) => prev.map((w, i) => (i === index ? { ...w, ...updates } : w)));
  };

  const removeWaypoint = (index) => {
    setWaypoints((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearWaypoints = () => {
    const lastCompleted = previousSegments[previousSegments.length - 1];
    if (lastCompleted && lastCompleted.waypoints.length > 0) {
      const lastWp = lastCompleted.waypoints[lastCompleted.waypoints.length - 1];
      setWaypoints([{ ...lastWp }]);
    } else {
      setWaypoints([]);
    }
  };

  const startSimulation = useCallback((parcelId, trackingNumber, carrierId) => {
    if (!trackingNumber || !parcelId || waypoints.length < 2) return false;

    setSimulating(true);
    setCurrentSimIndex(0);
    setSimParcelId(parcelId);
    setSimCompletedFor(null);

    const path = waypoints;
    if (path.length < 2) {
      setSimulating(false);
      setSimParcelId(null);
      return false;
    }

    const lastMode = waypoints[waypoints.length - 1]?.transportMode || 'truck';
    const totalSteps = computeSteps(path, lastMode);
    let pos = 0;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      pos += speedRef.current;
      if (pos >= totalSteps - 1) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setCurrentSimIndex(path.length - 1);
        completeSimulation(trackingNumber, carrierId, parcelId, path[path.length - 1], path);
        return;
      }

      const fraction = pos / (totalSteps - 1);
      const pathIdx = fraction * (path.length - 1);
      const idx = Math.floor(pathIdx);
      const frac = pathIdx - idx;
      const from = path[idx];
      const to = path[Math.min(idx + 1, path.length - 1)];
      const current = interpolate(from, to, frac);

      setCurrentSimIndex(pathIdx);

      if (parcelId) {
        eventBus.emit('location:update', {
          parcelId,
          lat: current.lat,
          lng: current.lng,
          carrierId: carrierId || undefined,
          carrierName: 'Simulation',
        });
      }
    }, 1000);

    return true;
  }, [completeSimulation, waypoints]);

  const stopSimulation = (trackingNumber, carrierId) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSimulating(false);
    setSimParcelId(null);
    setSimCompletedFor(null);
  };

  return (
    <SimulationContext.Provider value={{
      simMode, toggleMode,
      previousSegments, routeGeometry,
      waypoints, setWaypoints, addWaypoint, updateWaypoint, removeWaypoint, clearWaypoints,
      simulating, currentSimIndex, simParcelId, simCompletedFor, speed, setSpeed,
      loadSimulationSegments, startSimulation, stopSimulation,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export const useSimulation = () => useContext(SimulationContext);
