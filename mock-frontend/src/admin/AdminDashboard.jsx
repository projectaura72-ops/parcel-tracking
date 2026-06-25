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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Overview of parcels and platform users.</p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
          <button onClick={() => setTab('parcels')} className={`rounded-full px-4 py-2 text-sm font-medium transition ${tab === 'parcels' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:bg-white'}`}>
            Parcels
          </button>
          <button onClick={() => setTab('users')} className={`rounded-full px-4 py-2 text-sm font-medium transition ${tab === 'users' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:bg-white'}`}>
            Users
          </button>
        </div>
      </div>

      {tab === 'parcels' && (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-[0.06em] text-[11px]">
              <tr>
                <th className="text-left px-4 py-4">Tracking</th>
                <th className="text-left px-4 py-4">Name</th>
                <th className="text-left px-4 py-4">Owner</th>
                <th className="text-left px-4 py-4">Carrier</th>
                <th className="text-left px-4 py-4">Status</th>
                <th className="text-left px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {parcels.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.trackingNumber}</td>
                  <td className="px-4 py-3 text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.ownerId?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.currentCarrier?.name || 'Unassigned'}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{p.status}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleAssign(p._id)} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600 transition hover:bg-blue-100">
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
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-[0.06em] text-[11px]">
              <tr>
                <th className="text-left px-4 py-4">Name</th>
                <th className="text-left px-4 py-4">Email</th>
                <th className="text-left px-4 py-4">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
