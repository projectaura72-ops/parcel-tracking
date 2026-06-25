import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSimulation } from '../context/SimulationContext';

export default function Layout() {
  const { profile, setRole, logout } = useAuth();
  const { simMode, toggleMode, simulating } = useSimulation();
  const navigate = useNavigate();

  const handleRoleSwitch = async (e) => {
    const role = e.target.value;
    if (!role) return;
    await setRole(role);
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <nav className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-semibold text-xl tracking-tight text-slate-900">GoodsTracker</Link>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <select
              onChange={handleRoleSwitch}
              value={profile?.role || ''}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
            >
              <option value="" disabled>Switch role</option>
              <option value="owner">Owner</option>
              <option value="carrier">Carrier (Me)</option>
              <option value="Mock Carrier 1">Mock Carrier 1</option>
              <option value="Mock Carrier 2">Mock Carrier 2</option>
              <option value="Mock Carrier 3">Mock Carrier 3</option>
              <option value="admin">Admin</option>
            </select>
            {profile?.role === 'carrier' && (
              <button
                onClick={toggleMode}
                disabled={simulating}
                className={`rounded-lg border px-3 py-1.5 transition shadow-sm ${
                  simMode
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                } ${simulating ? 'opacity-60 cursor-not-allowed' : 'hover:shadow'} `}
              >
                {simMode ? 'Simulation mode' : 'Real mode'}
              </button>
            )}
            <span className="hidden sm:inline text-slate-500 capitalize">{profile?.role}</span>
            <span className="font-medium text-slate-700">{profile?.name}</span>
            <button onClick={handleLogout} className="rounded-lg bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100 transition">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 flex flex-col min-h-0 h-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 w-full">
        <Outlet />
      </main>
    </div>
  );
}
