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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">My Parcels</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {showCreate ? 'Cancel' : 'New Parcel'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow mb-4 grid grid-cols-2 gap-3">
          <input name="name" placeholder="Parcel name" required className="border rounded px-3 py-2 col-span-2" />
          <input name="description" placeholder="Description" className="border rounded px-3 py-2 col-span-2" />
          <input name="origin" placeholder="Origin" required className="border rounded px-3 py-2" />
          <input name="destination" placeholder="Destination" required className="border rounded px-3 py-2" />
          <button type="submit" className="bg-green-600 text-white py-2 rounded hover:bg-green-700 col-span-2">
            Create
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2">
          {parcels.map((p) => (
            <div
              key={p._id}
              onClick={() => setSelected(p)}
              className={`bg-white p-3 rounded-lg shadow cursor-pointer border-l-4 ${
                p.status === 'delivered' ? 'border-green-500' : p.status === 'in_transit' ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-gray-400 font-mono tracking-widest">{p.trackingNumber}</p>
              <p className="text-xs capitalize mt-1">{p.status.replace('_', ' ')}</p>
            </div>
          ))}
          {parcels.length === 0 && <p className="text-gray-400 text-center py-8">No parcels yet</p>}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <>
              <TrackingMap
                position={selected.currentLocation}
                routeSegments={selected.routeSegments || []}
              />
              <div className="bg-white p-4 rounded-lg shadow mt-4 grid grid-cols-2 gap-4">
                <div>
                  <h2 className="font-bold text-lg">{selected.name}</h2>
                  <p className="text-lg font-mono tracking-widest text-blue-600">{selected.trackingNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Status: <span className="capitalize font-semibold">{selected.status}</span></p>
                  <p className="text-sm">Carrier: {selected.currentCarrier?.name || 'Not assigned'}</p>
                </div>
                <div className="col-span-2 text-sm text-gray-500">
                  <p>From: {selected.origin} → To: {selected.destination}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow h-[55vh] flex items-center justify-center text-gray-400">
              Select a parcel to view tracking
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
