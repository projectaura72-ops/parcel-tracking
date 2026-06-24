import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const mockRole = localStorage.getItem('mockRole');
  if (mockRole) config.headers['x-mock-role'] = mockRole;
  return config;
});

export default api;
