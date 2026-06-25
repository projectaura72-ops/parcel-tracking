import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import TrackingMap from '../components/TrackingMap';

export default function OwnerDashboard() {
  const [parcels, setParcels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    const fetchParcels = async () => {
      const { data } = await api.get('/parcels');
      setParcels(data);
    };
    fetchParcels();
  }, []);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = Object.fromEntries(form);
    const { data } = await api.post('/parcels', body);
    setParcels((prev) => [data, ...prev]);
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">My Parcels</h1>
          <p className="mt-1 text-sm text-slate-500">Create new shipments and review active tracking details.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
          {showCreate ? 'Cancel' : 'New Parcel'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="name" placeholder="Parcel name" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-blue-300 focus:outline-none" />
            <input name="description" placeholder="Description" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-blue-300 focus:outline-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="origin" placeholder="Origin" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-blue-300 focus:outline-none" />
            <input name="destination" placeholder="Destination" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-blue-300 focus:outline-none" />
          </div>
          <button type="submit" className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-green-700">
            Create Parcel
          </button>
        </form>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {parcels.map((p) => (
            <div
              key={p._id}
              onClick={() => setSelected(p)}
              className={`group cursor-pointer rounded-3xl border p-4 shadow-sm transition duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg ${
                selected?._id === p._id ? 'border-slate-300 bg-slate-50 shadow-md' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500 font-mono">{p.trackingNumber}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  p.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : p.status === 'in_transit' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-800">Origin:</span> {p.origin || 'Unknown'}</p>
                <p><span className="font-medium text-slate-800">Destination:</span> {p.destination || 'Unknown'}</p>
              </div>
            </div>
          ))}
          {parcels.length === 0 && <p className="text-center text-slate-500 py-8">No parcels yet</p>}
        </div>

        <div>
          {selected ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <TrackingMap
                  position={selected.currentLocation}
                  routeSegments={selected.routeSegments || []}
                />
              </div>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm grid gap-4 sm:grid-cols-2">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selected.name}</h2>
                  <p className="mt-2 text-sm font-mono tracking-[0.18em] text-sky-600">{selected.trackingNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="mt-1 text-base font-semibold capitalize text-slate-900">{selected.status}</p>
                  <p className="mt-3 text-sm text-slate-600">Carrier</p>
                  <p className="mt-1 text-base text-slate-900">{selected.currentCarrier?.name || 'Not assigned'}</p>
                </div>
                <div className="sm:col-span-2 text-sm text-slate-600">
                  <p><span className="font-medium text-slate-900">Route:</span> {selected.origin} → {selected.destination}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm h-[55vh] flex items-center justify-center text-slate-400">
              Select a parcel to view tracking
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
