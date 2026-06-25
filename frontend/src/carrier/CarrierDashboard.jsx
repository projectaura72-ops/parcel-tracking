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
    simMode, waypoints, previousSegments, routeGeometry, saveRoute, loadSimulationSegments,
    startSimulation, stopSimulation, simulating, currentSimIndex, simParcelId, speed, setSpeed, clearWaypoints
  } = useSimulation();

  const MOCK_CARRIERS = [
    { _id: '000000000000000000000001', name: 'Mock Carrier 1' },
    { _id: '000000000000000000000002', name: 'Mock Carrier 2' },
    { _id: '000000000000000000000003', name: 'Mock Carrier 3' },
  ];

  const allCarriers = simMode
    ? [...MOCK_CARRIERS, ...carriers.filter((c) => !MOCK_CARRIERS.find((m) => m._id === c._id))]
    : carriers;

  const activeUserId = simMode && simOverride ? simOverride : profile?._id;

  useEffect(() => {
    if (!simMode) {
      api.get('/auth/carriers').then(({ data }) => setCarriers(data)).catch(() => {});
    }
  }, [simMode]);

  const fetchParcels = useCallback(async () => {
    let data;
    if (simMode) {
      const res = await api.get('/parcels/all');
      data = res.data;
    } else if (simOverride) {
      const res = await api.get('/carriers/parcels', { params: { simCarrierId: simOverride } });
      data = res.data;
    } else {
      const res = await api.get('/carriers/parcels');
      data = res.data;
    }
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

  const handleDeleteParcel = async (parcelId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this parcel?')) return;
    try {
      const headers = simMode && simOverride ? { 'x-sim-carrier-id': simOverride } : {};
      await api.delete(`/carriers/${parcelId}`, { headers });
      setParcels((prev) => prev.filter((p) => p._id !== parcelId));
      if (selected?._id === parcelId) setSelected(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting parcel');
    }
  };

  const handleSaveRoute = async () => {
    if (!selected) return;
    const cId = simOverride || profile?._id;
    const cName = allCarriers.find((c) => c._id === cId)?.name || profile?.name;
    await saveRoute(selected.trackingNumber, cId, cName);
    alert('Route saved!');
  };

  const handleStartSim = async () => {
    if (!selected) return;
    const cId = simOverride || profile?._id;
    await startSimulation(selected._id, selected.trackingNumber, socket, cId);
  };

  const handleStopSim = async () => {
    if (!selected) return;
    const cId = simOverride || profile?._id;
    await stopSimulation(selected.trackingNumber, cId);
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

  const displayedParcel = selected || parcelList[0] || null;

  const simHeaderText = simOverride
    ? `Simulating as: ${allCarriers.find((c) => c._id === simOverride)?.name || simOverride}`
    : '';

  useEffect(() => {
    if (!selected && parcelList.length > 0) {
      setSelected(parcelList[0]);
    }
  }, [selected, parcelList]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-1">Carrier Dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">Shipments & live delivery tracking</h1>
          {simHeaderText && (
            <p className="mt-2 text-sm text-slate-500">{simHeaderText}</p>
          )}
        </div>
        {simMode && allCarriers.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <label className="block text-xs text-slate-500 mb-2">Simulate as</label>
            <select
              value={simOverride}
              onChange={(e) => setSimOverride(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:ring-blue-200"
            >
              <option value="">Me ({profile?.name})</option>
              {allCarriers.filter((c) => c._id !== profile?._id).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 flex-1 min-h-0 h-full">
        {/* LEFT: All controls */}
        <div className="lg:col-span-1 flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm min-h-0">
          <div className="space-y-3">
            <button
              onClick={() => setShowClaim(!showClaim)}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {showClaim ? 'Cancel' : '+ Claim Parcel'}
            </button>
            {showClaim && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tracking code"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    className="flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono uppercase text-slate-700 focus:border-blue-300 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
                  />
                  <button
                    onClick={handleClaim}
                    disabled={!trackingCode.trim()}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1 max-h-[30vh] overflow-y-auto">
            {parcelList.map((p) => (
              <div
                key={p._id}
                onClick={() => { setSelected(p); setShowClaim(false); }}
                className={`bg-white p-2 rounded shadow cursor-pointer border-l-4 transition-colors text-xs group ${
                  selected?._id === p._id ? 'border-blue-500 ring-1 ring-blue-200' :
                  p.status === 'delivered' ? 'border-green-500' :
                  p.status === 'in_transit' ? 'border-blue-500' : 'border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{p.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isCurrentCarrier(p) && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">Yours</span>
                    )}
                    <button
                      onClick={(e) => handleDeleteParcel(p._id, e)}
                      className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete parcel"
                    >✕</button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-mono">{p.trackingNumber}</p>
                <span className="text-[10px] capitalize text-gray-500">{p.status.replace('_', ' ')}</span>
              </div>
            ))}
            {parcelList.length === 0 && (
              <p className="text-gray-400 text-center py-4 text-xs">No parcels</p>
            )}
          </div>

          {selected && (
            <div className="bg-white rounded-lg shadow p-2 space-y-2">
              <div>
                <p className="font-bold text-sm">{selected.name}</p>
                <p className="text-[10px] font-mono text-blue-600">{selected.trackingNumber}</p>
              </div>

              <div className="text-[11px] space-y-0.5">
                <p><span className="text-gray-500">From:</span> {selected.origin}</p>
                <p><span className="text-gray-500">To:</span> {selected.destination}</p>
                <p><span className="text-gray-500">Status:</span> <span className="capitalize">{selected.status.replace('_', ' ')}</span></p>
              </div>

              {/* Route progress */}
              {((activeSegments.length > 0 || completedSegments.length > 0) || previousSegments.length > 0) && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-700 mb-1">Progress</p>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {selected.routeSegments?.map((seg, i) => (
                      <div key={`rs-${i}`} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className={seg.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}>
                          {seg.carrierName}
                        </span>
                        <span className={`ml-auto text-[10px] ${seg.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                          {seg.status === 'completed' ? 'Done' : 'Active'}
                        </span>
                      </div>
                    ))}
                    {previousSegments.map((seg, i) => (
                      <div key={`sim-${i}`} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-gray-400 line-through">{seg.carrierName}</span>
                        {seg.waypoints.length > 0 && (
                          <span className="text-gray-400">{seg.waypoints[0].label}→{seg.waypoints[seg.waypoints.length - 1].label}</span>
                        )}
                        <span className="ml-auto text-green-600">Done</span>
                      </div>
                    ))}
                    {simMode && waypoints.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-500" />
                        <span className="text-gray-700 font-medium">Your route</span>
                        <span className="text-gray-400">{waypoints[0].label}→{waypoints[waypoints.length - 1].label}</span>
                        {simulating && <span className="ml-auto text-blue-600">Moving...</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                {!simMode && hasActiveSegment(selected) && (
                  <button onClick={() => handleCompleteSegment(selected._id)}
                    className="bg-yellow-600 text-white px-2 py-1 text-[11px] rounded hover:bg-yellow-700">
                    Complete Segment
                  </button>
                )}
                {!simMode && selected.status === 'in_transit' && !isCurrentCarrier(selected) && (
                  <button onClick={() => { setTrackingCode(selected.trackingNumber); setShowClaim(true); }}
                    className="bg-blue-600 text-white px-2 py-1 text-[11px] rounded hover:bg-blue-700">
                    Claim (Handoff)
                  </button>
                )}
                {simMode && (
                  <>
                    <button onClick={handleSaveRoute}
                      disabled={waypoints.length < 2 || simulating}
                      className="bg-blue-600 text-white px-2 py-1 text-[11px] rounded hover:bg-blue-700 disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={handleStartSim}
                      disabled={waypoints.length < 2 || simulating}
                      className="bg-green-600 text-white px-2 py-1 text-[11px] rounded hover:bg-green-700 disabled:opacity-50">
                      {simulating ? 'Run...' : 'Start'}
                    </button>
                    <button onClick={handleStopSim}
                      disabled={!simulating}
                      className="bg-red-600 text-white px-2 py-1 text-[11px] rounded hover:bg-red-700 disabled:opacity-50">
                      Stop
                    </button>
                    <button onClick={clearWaypoints}
                      disabled={simulating}
                      className="bg-gray-500 text-white px-2 py-1 text-[11px] rounded hover:bg-gray-600 disabled:opacity-50">
                      Clear
                    </button>
                    {!simulating && waypoints.length >= 2 && (
                      <button onClick={() => handleCompleteSegment(selected._id)}
                        className="bg-yellow-600 text-white px-2 py-1 text-[11px] rounded hover:bg-yellow-700">
                        Complete
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Speed controls */}
              {simMode && (
                <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
                  <span className="text-[10px] text-gray-500">Speed:</span>
                  {[1, 2, 5, 10].map((s) => (
                    <button key={s} onClick={() => setSpeed(s)}
                      className={`px-1.5 py-0.5 text-[10px] rounded border ${
                        speed === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                      }`}>
                      {s}x
                    </button>
                  ))}
                </div>
              )}

              {simulating && (
                <div className="bg-green-50 border border-green-200 rounded p-1.5 text-[11px] text-green-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Parcel moving...
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Map only (3/4) */}
        <div className="lg:col-span-3 min-h-0 h-full flex">
          <div className="h-full min-h-0 flex-1 flex flex-col">
            {simMode ? (
              <RoutePlanner
                previousSegments={previousSegments}
                currentLocation={displayedParcel?.currentLocation}
                simulating={simulating}
                currentSimIndex={currentSimIndex}
                waypoints={waypoints}
                routeGeometry={routeGeometry}
              />
            ) : (
              <TrackingMap
                position={displayedParcel?.currentLocation}
                routeSegments={displayedParcel?.routeSegments || []}
                height="h-full"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
