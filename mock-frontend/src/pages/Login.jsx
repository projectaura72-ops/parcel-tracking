import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roles = [
  { key: 'owner', label: 'Parcel Owner', emoji: '📦' },
  { key: 'carrier', label: 'Carrier', emoji: '🚚' },
  { key: 'admin', label: 'Admin', emoji: '⚙️' },
];

export default function Login() {
  const { setRole } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (role) => {
    await setRole(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-3xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">GoodsTracker</h1>
          <p className="mt-2 text-slate-500">Sign in to manage and track shipments with clarity.</p>
        </div>
        <div className="space-y-3">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => handleSelect(r.key)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-slate-700 transition hover:border-blue-300 hover:bg-white hover:shadow-sm flex items-center gap-4"
            >
              <span className="text-3xl">{r.emoji}</span>
              <span className="font-medium">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
