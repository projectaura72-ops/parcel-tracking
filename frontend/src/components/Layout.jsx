import { Outlet, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-blue-600">GoodsTracker</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 capitalize">{profile?.role}</span>
            <span className="text-sm text-gray-700">{profile?.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
