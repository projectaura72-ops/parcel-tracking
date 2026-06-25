import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import api from '../services/api';

export default function PublicTracking() {
  const { trackingNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParcel = async () => {
      try {
        const { data } = await api.get(`/parcels/track/${trackingNumber}`);
        setData(data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchParcel();
  }, [trackingNumber]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Parcel not found</div>;

  const { parcel, history } = data;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Tracking {parcel.trackingNumber}</h1>
              <p className="mt-2 text-sm text-slate-500">Real-time shipment status and history in one view.</p>
            </div>
            <p className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700">Status: <span className="font-semibold capitalize text-slate-900">{parcel.status}</span></p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm h-[55vh]">
          {parcel.currentLocation ? (
            <MapContainer center={[parcel.currentLocation.lat, parcel.currentLocation.lng]} zoom={13} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[parcel.currentLocation.lat, parcel.currentLocation.lng]}>
                <Popup>Current Location</Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">Location unavailable</div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Tracking History</h2>
          {history?.length === 0 ? (
            <p className="text-slate-500">No history yet</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-between sm:items-center">
                  <span className="text-sm capitalize text-slate-700">{entry.status.replace('_', ' ')}</span>
                  <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
