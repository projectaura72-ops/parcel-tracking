import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './owner/OwnerDashboard';
import CarrierDashboard from './carrier/CarrierDashboard';
import AdminDashboard from './admin/AdminDashboard';
import PublicTracking from './pages/PublicTracking';
import Layout from './components/Layout';

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/track/:trackingNumber" element={<PublicTracking />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<RoleRouter />} />
        <Route path="owner/*" element={<ProtectedRoute roles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
        <Route path="carrier/*" element={<ProtectedRoute roles={['carrier']}><CarrierDashboard /></ProtectedRoute>} />
        <Route path="admin/*" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function RoleRouter() {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" />;
  return <Navigate to={`/${profile.role}`} />;
}
