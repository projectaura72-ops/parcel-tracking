import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import api from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'owner' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const token = await user.getIdToken();
      localStorage.setItem('token', token);
      await api.post('/auth/register', { name: form.name, email: form.email, role: form.role });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <input
          type="text" placeholder="Name" required
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <input
          type="email" placeholder="Email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <input
          type="password" placeholder="Password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <select
          value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="w-full border rounded px-3 py-2 mb-4"
        >
          <option value="owner">Parcel Owner</option>
          <option value="carrier">Carrier</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Register
        </button>
        <p className="text-sm text-center mt-4">
          Already have an account? <Link to="/login" className="text-blue-600">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
