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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">GoodsTracker</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Select a role to continue</p>
        {roles.map((r) => (
          <button
            key={r.key}
            onClick={() => handleSelect(r.key)}
            className="w-full text-left px-4 py-3 mb-2 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition flex items-center gap-3"
          >
            <span className="text-2xl">{r.emoji}</span>
            <span className="font-medium">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
