import { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../services/api';

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

export function SimulationProvider({ children }) {
  const [simMode, setSimMode] = useState(false);
  const [waypoints, setWaypoints] = useState([]);
  const [previousSegments, setPreviousSegments] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [currentSimIndex, setCurrentSimIndex] = useState(0);
  const [simParcelId, setSimParcelId] = useState(null);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  speedRef.current = speed;
  const timerRef = useRef(null);

  const toggleMode = () => setSimMode((m) => !m);

  const loadSimulationSegments = useCallback(async (trackingNumber, carrierId) => {
    if (!trackingNumber) {
      setPreviousSegments([]);
      setWaypoints([]);
      return;
    }
    try {
      const { data } = await api.get(`/simulation/route/${trackingNumber}`);
      const completed = data.filter((s) => s.status === 'completed');
      setPreviousSegments(completed);

      const mySegment = data.find(
        (s) => s.carrierId && carrierId && s.carrierId.toString() === carrierId.toString() && (s.status === 'planned' || s.status === 'active')
      );
      if (mySegment) {
        setWaypoints(mySegment.waypoints);
      } else {
        const lastCompleted = completed[completed.length - 1];
        if (lastCompleted && lastCompleted.waypoints.length > 0) {
          const lastWp = lastCompleted.waypoints[lastCompleted.waypoints.length - 1];
          const nextLabel = LABELS[completed.length];
          setWaypoints([{ ...lastWp, label: nextLabel }]);
        } else {
          setWaypoints([]);
        }
      }
    } catch {
      setPreviousSegments([]);
      setWaypoints([]);
    }
  }, []);

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

  const saveRoute = async (trackingNumber) => {
    const { data } = await api.post('/simulation/route', { trackingNumber, waypoints });
    return data;
  };

  const startSimulation = useCallback(async (parcelId, trackingNumber, socket, carrierId) => {
    if (waypoints.length < 2) return;
    const { data } = await api.post('/simulation/start', { trackingNumber });
    const segment = data.segment || data.parcel?.simulationSegments?.slice(-1)[0];
    setSimulating(true);
    setCurrentSimIndex(0);
    setSimParcelId(parcelId);

    const segWaypoints = segment?.waypoints || waypoints;
    let segStart = 0;
    let step = 0;
    let steps = 0;
    let from = segWaypoints[0];
    let to = segWaypoints[1];

    if (timerRef.current) clearInterval(timerRef.current);

    const advance = () => {
      if (segStart >= segWaypoints.length - 1) return false;
      from = segWaypoints[segStart];
      to = segWaypoints[segStart + 1];
      const speed = SEGMENT_SPEEDS[to.transportMode] || SEGMENT_SPEEDS.truck;
      const dist = Math.sqrt((to.lat - from.lat) ** 2 + (to.lng - from.lng) ** 2);
      steps = Math.max(10, Math.floor(dist / speed));
      step = 0;
      return true;
    };

    advance();

    timerRef.current = setInterval(() => {
      step += speedRef.current;
      const fraction = step / steps;
      const pos = interpolate(from, to, Math.min(fraction, 1));
      setCurrentSimIndex(segStart + fraction);

      if (socket && parcelId) {
        socket.emit('location:update', {
          parcelId,
          lat: pos.lat,
          lng: pos.lng,
          carrierId: carrierId || undefined,
          carrierName: 'Simulation',
        });
      }

      if (fraction >= 1) {
        segStart++;
        if (!advance()) {
          clearInterval(timerRef.current);
          setSimulating(false);
          setCurrentSimIndex(segWaypoints.length - 1);
          api.post('/simulation/stop', { trackingNumber }).catch(() => {});
        }
      }
    }, 1000);
  }, [waypoints]);

  const stopSimulation = async (trackingNumber) => {
    try {
      await api.post('/simulation/stop', { trackingNumber });
    } catch {}
    setSimulating(false);
    setSimParcelId(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <SimulationContext.Provider value={{
      simMode, toggleMode,
      previousSegments,
      waypoints, setWaypoints, addWaypoint, updateWaypoint, removeWaypoint, clearWaypoints, saveRoute,
      simulating, currentSimIndex, simParcelId, speed, setSpeed,
      loadSimulationSegments, startSimulation, stopSimulation,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export const useSimulation = () => useContext(SimulationContext);
