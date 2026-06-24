import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const setRole = async (role) => {
    setLoading(true);
    localStorage.setItem('mockRole', role);
    try {
      const { data } = await api.get('/auth/me', { headers: { 'x-mock-role': role } });
      setProfile(data);
      setUser({ uid: data.firebaseUid });
    } catch {
      setProfile(null);
      setUser(null);
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('mockRole');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, setRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
