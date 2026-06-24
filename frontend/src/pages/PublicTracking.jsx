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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Tracking: {parcel.trackingNumber}</h1>
        <p className="text-gray-500 mb-4">Status: <span className="font-semibold capitalize">{parcel.status}</span></p>

        <div className="bg-white rounded-lg shadow h-[55vh] mb-6">
          {parcel.currentLocation && (
            <MapContainer center={[parcel.currentLocation.lat, parcel.currentLocation.lng]} zoom={13} className="h-full w-full rounded-lg">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[parcel.currentLocation.lat, parcel.currentLocation.lng]}>
                <Popup>Current Location</Popup>
              </Marker>
            </MapContainer>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Tracking History</h2>
          {history?.length === 0 && <p className="text-gray-400">No history yet</p>}
          <div className="space-y-2">
            {history?.map((entry, i) => (
              <div key={i} className="flex justify-between text-sm border-b pb-2">
                <span className="capitalize">{entry.status.replace('_', ' ')}</span>
                <span className="text-gray-400">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
