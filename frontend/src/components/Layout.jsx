import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSimulation } from '../context/SimulationContext';

export default function Layout() {
  const { profile, logout } = useAuth();
  const { simMode, toggleMode, simulating } = useSimulation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-blue-600">GoodsTracker</Link>
          <div className="flex items-center gap-4">
            {profile?.role === 'carrier' && (
              <button
                onClick={toggleMode}
                disabled={simulating}
                className={`text-sm px-3 py-1 rounded border transition-colors ${
                  simMode
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                } ${simulating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
              >
                {simMode ? '🖥 Simulation' : '📍 Real'}
              </button>
            )}
            <span className="text-sm text-gray-500 capitalize hidden sm:inline">{profile?.role}</span>
            <span className="text-sm text-gray-700">{profile?.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 min-h-0 max-w-7xl mx-auto p-2 sm:p-4 w-full">
        <Outlet />
      </main>
    </div>
  );
}
