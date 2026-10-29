import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { errorMessage, rupees } from '../api/client.js';

function Card({ label, value, hint }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/analytics').then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  if (!data) return <p>{error || 'Loading...'}</p>;

  const daily = data.daily.map((d) => ({ day: d.day.slice(5), revenue: d.revenuePaise / 100, orders: d.orders }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card label="Paid orders" value={data.paidOrders} />
        <Card label="Customer payments" value={rupees(data.revenuePaise)} />
        <Card label="Commission earned" value={rupees(data.commissionPaise)} />
        <Card label="Coupons paid by platform" value={rupees(data.discountPaise)} />
        <Card label="Platform net" value={rupees(data.platformNetPaise)} hint="commission minus coupons" />
        <Card label="Vendor earnings" value={rupees(data.vendorEarningsPaise)} />
        <Card label="Customers" value={data.users.CUSTOMER ?? 0} />
        <Card label="Approved vendors" value={data.vendors.APPROVED ?? 0} hint={`${data.vendors.PENDING ?? 0} pending`} />
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-2">Revenue, last 30 days (₹)</h2>
        {daily.length === 0 ? (
          <p className="text-sm text-gray-500">No paid orders in the last 30 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Top products (units sold)</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No sales yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="unitsSold" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Top vendors</h2>
          {data.topVendors.length === 0 && <p className="text-sm text-gray-500">No sales yet.</p>}
          {data.topVendors.map((v) => (
            <div key={v.vendorId} className="flex justify-between text-sm py-1 border-b">
              <span>{v.storeName}</span>
              <span>{rupees(v.earnedPaise)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VendorsTab() {
  const [vendors, setVendors] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api.get('/admin/vendors', { params: filter ? { status: filter } : {} })
      .then((r) => setVendors(r.data))
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => { load(); }, [filter]);

  async function update(id, body) {
    setError('');
    try {
      await api.patch(`/admin/vendors/${id}`, body);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function changeCommission(v) {
    const input = window.prompt('New commission % (0 to 50)', v.commissionPercent);
    if (input === null) return;
    const n = Number(input);
    if (!Number.isInteger(n) || n < 0 || n > 50) return setError('Commission must be a whole number from 0 to 50');
    update(v.id, { commissionPercent: n });
  }

  return (
    <div className="space-y-3">
      <select className="border rounded p-2" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All vendors</option>
        {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => <option key={s}>{s}</option>)}
      </select>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!vendors && <p>Loading...</p>}
      {vendors?.length === 0 && <p className="text-gray-500">No vendors found.</p>}
      {vendors?.map((v) => (
        <div key={v.id} className="bg-white rounded shadow p-3 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48">
            <p className="font-medium">{v.storeName} <span className="text-xs text-gray-500">#{v.id}</span></p>
            <p className="text-xs text-gray-500">{v.user.name} · {v.user.email}</p>
            <p className="text-sm">{v.status} · commission {v.commissionPercent}%</p>
          </div>
          {v.status !== 'APPROVED' && (
            <button onClick={() => update(v.id, { status: 'APPROVED' })} className="bg-green-600 text-white rounded px-3 py-1 text-sm">Approve</button>
          )}
          {v.status === 'PENDING' && (
            <button onClick={() => update(v.id, { status: 'REJECTED' })} className="border text-red-600 rounded px-3 py-1 text-sm">Reject</button>
          )}
          {v.status === 'APPROVED' && (
            <button onClick={() => update(v.id, { status: 'SUSPENDED' })} className="border text-red-600 rounded px-3 py-1 text-sm">Suspend</button>
          )}
          <button onClick={() => changeCommission(v)} className="text-sm text-indigo-600">Set commission</button>
        </div>
      ))}
    </div>
  );
}

function CouponsTab() {
  const [coupons, setCoupons] = useState(null);
  const [form, setForm] = useState({ code: '', discountPercent: 10, maxUses: 100, expiresAt: '' });
  const [msg, setMsg] = useState({ text: '', ok: true });

  const load = () => api.get('/coupons').then((r) => setCoupons(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function create(e) {
    e.preventDefault();
    const body = {
      code: form.code,
      discountPercent: Number(form.discountPercent),
      maxUses: Number(form.maxUses),
    };
    if (form.expiresAt) body.expiresAt = form.expiresAt;
    try {
      await api.post('/coupons', body);
      setMsg({ text: 'Coupon created', ok: true });
      setForm({ ...form, code: '' });
      load();
    } catch (err) {
      setMsg({ text: errorMessage(err), ok: false });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="bg-white rounded shadow p-4 grid gap-3 md:grid-cols-4">
        <input required placeholder="CODE" minLength={3} maxLength={20} className="border rounded p-2 uppercase" value={form.code} onChange={set('code')} />
        <input required type="number" min="1" max="90" placeholder="Discount %" className="border rounded p-2" value={form.discountPercent} onChange={set('discountPercent')} />
        <input required type="number" min="1" placeholder="Max uses" className="border rounded p-2" value={form.maxUses} onChange={set('maxUses')} />
        <input type="date" className="border rounded p-2" value={form.expiresAt} onChange={set('expiresAt')} />
        <button className="bg-indigo-600 text-white rounded p-2 md:col-span-4">Create coupon</button>
        {msg.text && <p className={`text-sm md:col-span-4 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
      </form>

      <div className="bg-white rounded shadow divide-y">
        {coupons?.length === 0 && <p className="p-3 text-gray-500 text-sm">No coupons yet.</p>}
        {coupons?.map((c) => (
          <div key={c.id} className="p-3 flex justify-between text-sm">
            <span className="font-medium">{c.code} · {c.discountPercent}% off</span>
            <span className="text-gray-500">
              used {c.usedCount}/{c.maxUses}
              {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('analytics');
  const tabs = { analytics: <AnalyticsTab />, vendors: <VendorsTab />, coupons: <CouponsTab /> };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-4">Admin</h1>
      <div className="flex gap-4 border-b mb-4">
        {Object.keys(tabs).map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`pb-2 capitalize ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tabs[tab]}
    </div>
  );
}