import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';
import { fetchRouteGeometry } from '../services/routing';

const SimulationContext = createContext(null);

const SEGMENT_SPEEDS = {
  truck: 0.0005,
  ship: 0.0003,
  plane: 0.002,
};

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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

  const loadSimulationSegments = useCallback(async (trackingNumber, carrierId) => {
    if (!trackingNumber) {
      setPreviousSegments([]);
      setWaypoints([]);
      return;
    }
    try {
      const { data } = await api.get(`/simulation/route/${trackingNumber}`);
      const allCompleted = data.filter((s) => s.status === 'completed');

      const mySegment = data.find(
        (s) => s.carrierId && carrierId && s.carrierId.toString() === carrierId.toString() && (s.status === 'planned' || s.status === 'active')
      );

      const others = data.filter(
        (s) => !(s.carrierId && carrierId && s.carrierId.toString() === carrierId.toString() && (s.status === 'planned' || s.status === 'active'))
      );
      setPreviousSegments(others);

      if (mySegment) {
        setWaypoints(mySegment.waypoints);
        if (mySegment.routeGeometry && mySegment.routeGeometry.length > 0) {
          setRouteGeometry(mySegment.routeGeometry);
        } else {
          setRouteGeometry([]);
        }
      } else {
        const lastCompleted = allCompleted[allCompleted.length - 1];
        if (lastCompleted && lastCompleted.waypoints.length > 0) {
          setWaypoints(lastCompleted.waypoints);
          if (lastCompleted.routeGeometry && lastCompleted.routeGeometry.length > 0) {
            setRouteGeometry(lastCompleted.routeGeometry);
          } else {
            setRouteGeometry(lastCompleted.waypoints.map((w) => ({ lat: w.lat, lng: w.lng })));
          }
        } else {
          setWaypoints([]);
          setRouteGeometry([]);
        }
      }
    } catch {
      setPreviousSegments([]);
      setWaypoints([]);
    }
  }, []);

  const completeSimulation = useCallback(async (
    trackingNumber,
    carrierId,
    socket,
    parcelId,
    finalPoint,
    path,
    onComplete
  ) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setSimulating(false);
    setSimParcelId(null);
    setCurrentSimIndex(null);

    if (path && path.length >= 2) {
      setRouteGeometry(path);
      if (waypoints.length > 0) {
        setWaypoints(waypoints);
      }
    }

    if (socket && parcelId && finalPoint) {
      socket.emit('location:update', {
        parcelId,
        lat: finalPoint.lat,
        lng: finalPoint.lng,
        carrierId: carrierId || undefined,
        carrierName: 'Simulation',
      });
    }

    try {
      const headers = carrierId ? { 'x-sim-carrier-id': carrierId } : {};
      await api.post('/simulation/stop', { trackingNumber }, { headers });
      if (trackingNumber) {
        await loadSimulationSegments(trackingNumber, carrierId);
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return true;
    } catch {
      if (trackingNumber) {
        try {
          await loadSimulationSegments(trackingNumber, carrierId);
        } catch {}
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return false;
    }
  }, [loadSimulationSegments, waypoints]);

  const addWaypoint = (lat, lng, transportMode = 'truck') => {
    const offset = previousSegments.reduce((sum, s) => sum + s.waypoints.length, 0);
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
      const nextLabel = LABELS[previousSegments.length];
      setWaypoints([{ ...lastWp, label: nextLabel }]);
    } else {
      setWaypoints([]);
    }
  };

  const saveRoute = async (trackingNumber, carrierId, carrierName) => {
    const headers = {};
    if (carrierId) headers['x-sim-carrier-id'] = carrierId;
    if (carrierName) headers['x-sim-carrier-name'] = carrierName;
    const { data } = await api.post('/simulation/route', {
      trackingNumber, waypoints,
      routeGeometry: routeGeometry.length > 0 ? routeGeometry : undefined,
    }, { headers });
    return data;
  };

  const startSimulation = useCallback(async (parcelId, trackingNumber, socket, carrierId) => {
    if (!trackingNumber || !parcelId || waypoints.length < 2) return false;

    setSimulating(true);
    setCurrentSimIndex(0);
    setSimParcelId(parcelId);

    const path = routeGeometry.length >= 2 ? routeGeometry : waypoints;
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
        completeSimulation(trackingNumber, carrierId, socket, parcelId, path[path.length - 1], path);
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

      if (socket && parcelId) {
        socket.emit('location:update', {
          parcelId,
          lat: current.lat,
          lng: current.lng,
          carrierId: carrierId || undefined,
          carrierName: 'Simulation',
        });
      }
    }, 1000);

    try {
      const headers = carrierId ? { 'x-sim-carrier-id': carrierId } : {};
      await api.post('/simulation/start', { trackingNumber }, { headers });
      return true;
    } catch {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSimulating(false);
      setSimParcelId(null);
      return false;
    }
  }, [waypoints, routeGeometry]);

  const stopSimulation = async (trackingNumber, carrierId, onComplete) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSimulating(false);
    setSimParcelId(null);
    setCurrentSimIndex(null);
    if (!trackingNumber) {
      if (typeof onComplete === 'function') onComplete();
      return false;
    }
    try {
      const headers = carrierId ? { 'x-sim-carrier-id': carrierId } : {};
      await api.post('/simulation/stop', { trackingNumber }, { headers });
      await loadSimulationSegments(trackingNumber, carrierId);
      if (typeof onComplete === 'function') onComplete();
      return true;
    } catch {
      try {
        await loadSimulationSegments(trackingNumber, carrierId);
      } catch {}
      if (typeof onComplete === 'function') onComplete();
      return true;
    }
  };

  return (
    <SimulationContext.Provider value={{
      simMode, toggleMode,
      previousSegments, routeGeometry,
      waypoints, setWaypoints, addWaypoint, updateWaypoint, removeWaypoint, clearWaypoints, saveRoute,
      simulating, currentSimIndex, simParcelId, speed, setSpeed,
      loadSimulationSegments, startSimulation, stopSimulation,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export const useSimulation = () => useContext(SimulationContext);
