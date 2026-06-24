import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useGeolocation } from '../hooks/useGeolocation';
import TrackingMap from '../components/TrackingMap';

export default function CarrierDashboard() {
  const [parcels, setParcels] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [qrData, setQrData] = useState('');
  const { position } = useGeolocation();
  const socket = useSocket();

  useEffect(() => {
    const fetchParcels = async () => {
      const { data } = await api.get('/carriers/parcels');
      setParcels(data);
    };
    fetchParcels();
  }, []);

  const sendLocation = useCallback(() => {
    if (!position || !socket) return;
    parcels.forEach((p) => {
      if (p.status === 'in_transit') {
        socket.emit('location:update', {
          parcelId: p._id,
          lat: position.lat,
          lng: position.lng,
        });
      }
    });
  }, [position, socket, parcels]);

  useEffect(() => {
    if (!position) return;
    const interval = setInterval(sendLocation, 10000);
    return () => clearInterval(interval);
  }, [sendLocation, position]);

  const handleScan = async () => {
    try {
      const { data } = await api.post('/carriers/scan', { trackingNumber: qrData });
      setParcels((prev) => [data, ...prev]);
      setQrData('');
      setShowScanner(false);
      alert('Parcel claimed!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error scanning parcel');
    }
  };

  const updateStatus = async (parcelId, status) => {
    if (!socket) return;
    socket.emit('parcel:status', {
      parcelId,
      status,
      lat: position?.lat,
      lng: position?.lng,
      message: `Status changed to ${status}`,
    });
    setParcels((prev) => prev.map((p) => (p._id === parcelId ? { ...p, status } : p)));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Carrier Dashboard</h1>

      {position && (
        <p className="text-xs text-gray-400 mb-4">
          GPS: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </p>
      )}

      <button
        onClick={() => setShowScanner(!showScanner)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
      >
        {showScanner ? 'Close Scanner' : 'Scan QR Code'}
      </button>

      {showScanner && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <input
            type="text"
            placeholder="Enter tracking number manually"
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            className="border rounded px-3 py-2 w-full mb-2"
          />
          <button onClick={handleScan} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Claim Parcel
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {parcels.map((p) => (
          <div key={p._id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-gray-400">{p.trackingNumber}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded capitalize ${
                p.status === 'delivered' ? 'bg-green-100 text-green-700' :
                p.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {p.status.replace('_', ' ')}
              </span>
            </div>

            <TrackingMap position={p.currentLocation || position} route={p.route} height="h-40" />

            <div className="flex gap-2 mt-3">
              {p.status === 'pending' && (
                <button onClick={() => updateStatus(p._id, 'in_transit')} className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700">
                  Start Delivery
                </button>
              )}
              {p.status === 'in_transit' && (
                <button onClick={() => updateStatus(p._id, 'delivered')} className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700">
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        ))}
        {parcels.length === 0 && <p className="col-span-2 text-gray-400 text-center py-8">No assigned parcels</p>}
      </div>
    </div>
  );
}
