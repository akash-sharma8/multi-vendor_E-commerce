import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await register(form);
      navigate(user.role === 'VENDOR' ? '/vendor' : '/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-16 bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Create account</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input required placeholder="Name" className="w-full border rounded p-2" value={form.name} onChange={set('name')} />
      <input type="email" required placeholder="Email" className="w-full border rounded p-2" value={form.email} onChange={set('email')} />
      <input type="password" required minLength={8} placeholder="Password (min 8 characters)" className="w-full border rounded p-2" value={form.password} onChange={set('password')} />
      <select className="w-full border rounded p-2" value={form.role} onChange={set('role')}>
        <option value="CUSTOMER">I want to buy</option>
        <option value="VENDOR">I want to sell</option>
      </select>
      <button disabled={busy} className="w-full bg-indigo-600 text-white rounded p-2 disabled:opacity-50">
        {busy ? 'Creating...' : 'Sign up'}
      </button>
      <p className="text-sm text-gray-600">
        Already registered? <Link to="/login" className="text-indigo-600">Login</Link>
      </p>
    </form>
  );
}