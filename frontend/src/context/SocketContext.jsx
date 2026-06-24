import { createContext, useContext, useEffect, useState } from 'react';
import { createSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { profile } = useAuth();

  useEffect(() => {
    const s = createSocket();
    setSocket(s);

    s.on('connect', () => {
      if (profile?._id) s.emit('user:online', profile._id);
    });

    return () => { s.disconnect(); };
  }, [profile]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
