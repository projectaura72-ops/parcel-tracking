import { io } from 'socket.io-client';

const DEFAULT_SOCKET_URL = 'https://parcel-tracking-1-78ro.onrender.com';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    ? DEFAULT_SOCKET_URL
    : 'http://localhost:5000');

export const createSocket = () => io(SOCKET_URL, { transports: ['websocket', 'polling'] });
