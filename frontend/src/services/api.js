import axios from 'axios';

const DEFAULT_API_URL = 'https://parcel-tracking-1-78ro.onrender.com/api';
const API_URL = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    ? DEFAULT_API_URL
    : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const mockRole = localStorage.getItem('mockRole');
  if (mockRole) config.headers['x-mock-role'] = mockRole;
  return config;
});

export default api;
