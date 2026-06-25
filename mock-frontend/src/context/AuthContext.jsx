import { createContext, useContext, useState } from 'react';
import { findUserByFirebaseUid, registerUser as mockRegister, getUserById } from '../mock/db';

const AuthContext = createContext(null);

const ROLE_MAP = {
  owner: { role: 'owner', uid: 'mock-owner' },
  carrier: { role: 'carrier', uid: 'mock-carrier' },
  'Mock Carrier 1': { role: 'carrier', uid: '000000000000000000000001' },
  'Mock Carrier 2': { role: 'carrier', uid: '000000000000000000000002' },
  'Mock Carrier 3': { role: 'carrier', uid: '000000000000000000000003' },
  admin: { role: 'admin', uid: 'mock-admin' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const setRole = async (roleKey) => {
    setLoading(true);
    const entry = ROLE_MAP[roleKey];
    if (!entry) {
      setProfile(null);
      setUser(null);
      setLoading(false);
      return;
    }
    localStorage.setItem('mockRole', entry.role);
    localStorage.setItem('mockUserId', entry.uid);

    let found;
    if (entry.uid.startsWith('mock-')) {
      found = findUserByFirebaseUid(entry.uid);
    } else {
      found = getUserById(entry.uid);
    }
    setProfile(found);
    setUser(found ? { uid: found.firebaseUid } : null);
    setLoading(false);
  };

  const register = async ({ name, email, password, role }) => {
    const created = mockRegister({ name, email, password, role });
    if (!created) throw new Error('Email already registered');
    localStorage.setItem('mockRole', created.role);
    setProfile(created);
    setUser({ uid: created.firebaseUid });
    return created;
  };

  const logout = () => {
    localStorage.removeItem('mockRole');
    localStorage.removeItem('mockUserId');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, setRole, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
