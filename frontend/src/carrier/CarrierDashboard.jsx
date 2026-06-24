import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../context/AuthContext';
import { useSimulation } from '../context/SimulationContext';
import TrackingMap from '../components/TrackingMap';
import RoutePlanner from '../components/RoutePlanner';

export default function CarrierDashboard() {
  const [parcels, setParcels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [showClaim, setShowClaim] = useState(false);
  const [carriers, setCarriers] = useState([]);
  const [simOverride, setSimOverride] = useState('');
  const { position } = useGeolocation();
  const socket = useSocket();
  const { profile } = useAuth();
  const {
    simMode, waypoints, previousSegments, saveRoute, loadSimulationSegments,
    startSimulation, stopSimulation, simulating, currentSimIndex, simParcelId, speed, setSpeed, clearWaypoints
  } = useSimulation();

  const activeUserId = simMode && simOverride ? simOverride : profile?._id;

  useEffect(() => {
    api.get('/auth/carriers').then(({ data }) => setCarriers(data)).catch(() => {});
  }, []);

  const fetchParcels = useCallback(async () => {
    const params = simMode && simOverride ? { params: { simCarrierId: simOverride } } : {};
    const { data } = await api.get('/carriers/parcels', params);
    setParcels(data);
    setSelected((prev) => {
      if (!prev) return null;
      const updated = data.find((p) => p._id === prev._id);
      return updated || null;
    });
  }, [simMode, simOverride]);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  useEffect(() => {
    if (simMode && selected) {
      loadSimulationSegments(selected.trackingNumber, activeUserId);
    }
  }, [simMode, selected?.trackingNumber, activeUserId]);

  const prevSim = useRef(simulating);
  useEffect(() => {
    if (prevSim.current && !simulating && selected) {
      fetchParcels();
      loadSimulationSegments(selected.trackingNumber, activeUserId);
    }
    prevSim.current = simulating;
  }, [simulating]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setParcels((prev) =>
        prev.map((p) =>
          p._id === data.parcelId
            ? { ...p, currentLocation: { lat: data.lat, lng: data.lng } }
            : p
        )
      );
      setSelected((prev) =>
        prev?._id === data.parcelId
          ? { ...prev, currentLocation: { lat: data.lat, lng: data.lng } }
          : prev
      );
    };
    socket.on('location:update', handler);
    return () => socket.off('location:update', handler);
  }, [socket]);

  const sendLocation = useCallback(() => {
    if (!position || !socket || simMode) return;
    parcels.forEach((p) => {
      const cId = p.currentCarrier?._id || p.currentCarrier;
      if (cId?.toString() === profile?._id && p.status === 'in_transit') {
        socket.emit('location:update', {
          parcelId: p._id,
          lat: position.lat,
          lng: position.lng,
          carrierName: profile?.name || 'Carrier',
        });
      }
    });
  }, [position, socket, parcels, profile, simMode]);

  useEffect(() => {
    if (!position || simMode) return;
    const interval = setInterval(sendLocation, 10000);
    return () => clearInterval(interval);
  }, [sendLocation, position, simMode]);

  const handleClaim = async () => {
    if (!trackingCode.trim()) return;
    try {
      const headers = simMode && simOverride ? { 'x-sim-carrier-id': simOverride } : {};
      const { data } = await api.post('/carriers/scan', {
        trackingNumber: trackingCode.trim().toUpperCase(),
        lat: position?.lat,
        lng: position?.lng,
      }, { headers });
      setParcels((prev) => [data, ...prev]);
      setSelected(data);
      setTrackingCode('');
      setShowClaim(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error claiming parcel');
    }
  };

  const handleCompleteSegment = async (parcelId) => {
    try {
      const headers = simMode && simOverride ? { 'x-sim-carrier-id': simOverride } : {};
      const { data } = await api.post(`/carriers/${parcelId}/complete-segment`, {}, { headers });
      setParcels((prev) => prev.map((p) => (p._id === parcelId ? data : p)));
      setSelected(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Error completing segment');
    }
  };

  const handleSaveRoute = async () => {
    if (!selected) return;
    await saveRoute(selected.trackingNumber);
    alert('Route saved!');
  };

  const handleStartSim = async () => {
    if (!selected) return;
    const cId = simOverride || profile?._id;
    await startSimulation(selected._id, selected.trackingNumber, socket, cId);
  };

  const handleStopSim = async () => {
    if (!selected) return;
    await stopSimulation(selected.trackingNumber);
    fetchParcels();
  };

  const isCurrentCarrier = (parcel) => {
    if (!parcel) return false;
    const id = parcel.currentCarrier?._id || parcel.currentCarrier;
    return id?.toString() === activeUserId;
  };

  const hasActiveSegment = (parcel) => {
    if (!parcel) return false;
    return parcel.routeSegments?.some(
      (s) => s.carrierId?.toString() === activeUserId && s.status === 'active'
    );
  };

  const activeSegments = selected?.routeSegments?.filter((s) => s.status === 'active') || [];
  const completedSegments = selected?.routeSegments?.filter((s) => s.status === 'completed') || [];

  const parcelList = simMode && simOverride
    ? parcels
    : (parcels.filter((p) =>
        p.routeSegments?.some((s) => s.carrierId?.toString() === profile?._id) ||
        p.currentCarrier?._id === profile?._id ||
        p.currentCarrier === profile?._id
      ));

  const simHeaderText = simOverride
    ? `Simulating as: ${carriers.find((c) => c._id === simOverride)?.name || simOverride}`
    : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Carrier Dashboard</h1>

        {simMode && carriers.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Simulate as:</label>
            <select
              value={simOverride}
              onChange={(e) => setSimOverride(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Me ({profile?.name})</option>
              {carriers.filter((c) => c._id !== profile?._id).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {simHeaderText && (
        <p className="text-xs text-purple-600 mb-2 font-medium">{simHeaderText}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left panel: parcel list */}
        <div className="lg:col-span-1 space-y-2">
          <button
            onClick={() => setShowClaim(!showClaim)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            {showClaim ? 'Cancel' : '+ Claim Parcel'}
          </button>

          {showClaim && (
            <div className="bg-white p-3 rounded-lg shadow">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Enter tracking code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GT1A2B3C4D"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  className="border rounded px-2 py-1 text-sm w-full font-mono uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
                />
                <button
                  onClick={handleClaim}
                  disabled={!trackingCode.trim()}
                  className="bg-green-600 text-white px-3 py-1 text-xs rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Go
                </button>
              </div>
            </div>
          )}

          {parcelList.map((p) => (
            <div
              key={p._id}
              onClick={() => { setSelected(p); setShowClaim(false); }}
              className={`bg-white p-3 rounded-lg shadow cursor-pointer border-l-4 transition-colors ${
                selected?._id === p._id ? 'border-blue-500 ring-2 ring-blue-200' :
                p.status === 'delivered' ? 'border-green-500' :
                p.status === 'in_transit' ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-gray-400 font-mono">{p.trackingNumber}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs capitalize text-gray-500">{p.status.replace('_', ' ')}</span>
                {isCurrentCarrier(p) && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Yours</span>
                )}
              </div>
            </div>
          ))}
          {parcelList.length === 0 && (
            <p className="text-gray-400 text-center py-8 text-sm">No parcels yet</p>
          )}
        </div>

        {/* Right panel: parcel detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <>
              {simMode ? (
                <RoutePlanner
                  previousSegments={previousSegments}
                  currentLocation={selected.currentLocation}
                  simulating={simulating}
                  currentSimIndex={currentSimIndex}
                  waypoints={waypoints}
                />
              ) : (
                <TrackingMap
                  position={selected.currentLocation}
                  routeSegments={selected.routeSegments || []}
                />
              )}

              <div className="bg-white p-4 rounded-lg shadow mt-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="font-bold text-lg">{selected.name}</h2>
                    <p className="text-sm font-mono tracking-widest text-blue-600">{selected.trackingNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded capitalize ${
                      selected.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      selected.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selected.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <p className="text-gray-500">From: <span className="text-gray-800">{selected.origin}</span></p>
                  <p className="text-gray-500">To: <span className="text-gray-800">{selected.destination}</span></p>
                </div>

                {/* Route segments overview (real + simulation) */}
                {((activeSegments.length > 0 || completedSegments.length > 0) || previousSegments.length > 0) && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Route Progress</p>
                    <div className="space-y-1.5">
                      {/* Real route segments */}
                      {selected.routeSegments?.map((seg, i) => (
                        <div key={`rs-${i}`} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                          <span className={seg.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}>
                            {seg.carrierName}
                          </span>
                          <span className={`ml-auto text-xs ${seg.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                            {seg.status === 'completed' ? 'Done' : 'Active'}
                          </span>
                        </div>
                      ))}
                      {/* Simulation segments from other carriers */}
                      {previousSegments.map((seg, i) => (
                        <div key={`sim-${i}`} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                          <span className="text-gray-400 line-through">{seg.carrierName}</span>
                          {seg.waypoints.length > 0 && (
                            <span className="text-gray-400">
                              {seg.waypoints[0].label} → {seg.waypoints[seg.waypoints.length - 1].label}
                            </span>
                          )}
                          <span className="ml-auto text-green-600 text-xs">Completed</span>
                        </div>
                      ))}
                      {/* Current carrier's planned waypoints (simulation) */}
                      {simMode && waypoints.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-500" />
                          <span className="text-gray-700 font-medium">Your route</span>
                          <span className="text-gray-400">
                            {waypoints[0].label} → {waypoints[waypoints.length - 1].label}
                          </span>
                          {simulating && <span className="ml-auto text-blue-600 text-xs">Moving...</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {!simMode && hasActiveSegment(selected) && (
                    <button
                      onClick={() => handleCompleteSegment(selected._id)}
                      className="bg-yellow-600 text-white px-4 py-2 text-sm rounded hover:bg-yellow-700"
                    >
                      Complete Segment & Handoff
                    </button>
                  )}

                  {!simMode && selected.status === 'in_transit' && isCurrentCarrier(selected) && !hasActiveSegment(selected) && (
                    <button
                      disabled
                      className="bg-gray-400 text-white px-4 py-2 text-sm rounded cursor-not-allowed"
                      title="Send a location update first to create your segment"
                    >
                      No Active Segment
                    </button>
                  )}

                  {!simMode && selected.status === 'in_transit' && !isCurrentCarrier(selected) && (
                    <button
                      onClick={() => {
                        setTrackingCode(selected.trackingNumber);
                        setShowClaim(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700"
                    >
                      Claim This Parcel (Handoff)
                    </button>
                  )}

                  {simMode && (
                    <>
                      <button
                        onClick={handleSaveRoute}
                        disabled={waypoints.length < 2 || simulating}
                        className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save Route
                      </button>
                      <button
                        onClick={handleStartSim}
                        disabled={waypoints.length < 2 || simulating}
                        className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {simulating ? 'Running...' : 'Start Sim'}
                      </button>
                      <button
                        onClick={handleStopSim}
                        disabled={!simulating}
                        className="bg-red-600 text-white px-4 py-2 text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Stop
                      </button>
                      <div className="flex items-center gap-1 border-l pl-2 ml-1">
                        {[1, 2, 5, 10].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`px-2 py-1 text-xs rounded border ${
                              speed === s
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={clearWaypoints}
                        disabled={simulating}
                        className="bg-gray-500 text-white px-4 py-2 text-sm rounded hover:bg-gray-600 disabled:opacity-50"
                      >
                        Clear
                      </button>
                      {!simulating && waypoints.length >= 2 && (
                        <button
                          onClick={() => handleCompleteSegment(selected._id)}
                          className="bg-yellow-600 text-white px-4 py-2 text-sm rounded hover:bg-yellow-700"
                        >
                          Complete Segment
                        </button>
                      )}
                    </>
                  )}
                </div>

                {simulating && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2 text-sm text-green-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Parcel moving along route...
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow h-[55vh] flex items-center justify-center text-gray-400">
              Select a parcel to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
