import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roles = [
  { key: 'owner', label: 'Parcel Owner', emoji: '📦' },
  { key: 'carrier', label: 'Carrier', emoji: '🚚' },
  { key: 'admin', label: 'Admin', emoji: '⚙️' },
];

export default function Register() {
  const { setRole } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (role) => {
    await setRole(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">Create Account</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Choose your role</p>
        {roles.map((r) => (
          <button
            key={r.key}
            onClick={() => handleSelect(r.key)}
            className="w-full text-left px-4 py-3 mb-2 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition flex items-center gap-3"
          >
            <span className="text-2xl">{r.emoji}</span>
            <div>
              <span className="font-medium">{r.label}</span>
              <p className="text-xs text-gray-400">
                {r.key === 'owner' ? 'Create and track parcels' : r.key === 'carrier' ? 'Deliver parcels' : 'Manage everything'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
