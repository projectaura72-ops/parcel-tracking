import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminDashboard() {
  const [parcels, setParcels] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('parcels');

  useEffect(() => {
    const fetchData = async () => {
      const [parcelsRes, usersRes] = await Promise.all([
        api.get('/parcels/all'),
        api.get('/auth/users'),
      ]);
      setParcels(parcelsRes.data);
      setUsers(usersRes.data);
    };
    fetchData();
  }, []);

  const handleAssign = async (parcelId) => {
    const carrierId = prompt('Enter carrier ID:');
    if (!carrierId) return;
    try {
      await api.patch(`/parcels/${parcelId}/assign`, { carrierId });
      alert('Carrier assigned');
    } catch (err) {
      alert(err.response?.data?.message || 'Error assigning carrier');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('parcels')} className={`px-4 py-2 rounded ${tab === 'parcels' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          Parcels
        </button>
        <button onClick={() => setTab('users')} className={`px-4 py-2 rounded ${tab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          Users
        </button>
      </div>

      {tab === 'parcels' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Tracking</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3">Carrier</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="p-3 font-mono text-xs">{p.trackingNumber}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.ownerId?.name || 'N/A'}</td>
                  <td className="p-3">{p.currentCarrier?.name || 'Unassigned'}</td>
                  <td className="p-3 capitalize">{p.status}</td>
                  <td className="p-3">
                    <button onClick={() => handleAssign(p._id)} className="text-blue-600 hover:underline text-xs">
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
