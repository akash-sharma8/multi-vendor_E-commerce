import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'VENDOR' ? '/vendor' : '/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-16 bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input
        type="email" required placeholder="Email" className="w-full border rounded p-2"
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="password" required placeholder="Password" className="w-full border rounded p-2"
        value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <button disabled={busy} className="w-full bg-indigo-600 text-white rounded p-2 disabled:opacity-50">
        {busy ? 'Logging in...' : 'Login'}
      </button>
      <p className="text-sm text-gray-600">
        New here? <Link to="/register" className="text-indigo-600">Create an account</Link>
      </p>
    </form>
  );
}