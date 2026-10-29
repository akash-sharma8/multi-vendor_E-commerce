import { useEffect, useState } from 'react';
import api, { errorMessage, rupees } from '../api/client.js';

const CATEGORIES = [
  { id: 1, name: 'Electronics' },
  { id: 2, name: 'Clothing' },
  { id: 3, name: 'Books' },
  { id: 4, name: 'Home' },
  { id: 5, name: 'Beauty' },
];

// same rules as the backend, so we only show buttons that will work
const NEXT = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
};

function ApplyForm({ onDone }) {
  const [form, setForm] = useState({ storeName: '', description: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/vendors/apply', {
        storeName: form.storeName,
        description: form.description || undefined,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow space-y-3">
      <h1 className="text-xl font-semibold">Open your store</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input
        required minLength={3} maxLength={60} placeholder="Store name"
        className="w-full border rounded p-2"
        value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })}
      />
      <textarea
        placeholder="About your store (optional)" rows={3} maxLength={500}
        className="w-full border rounded p-2"
        value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <button className="w-full bg-indigo-600 text-white rounded p-2">Apply</button>
    </form>
  );
}

const EMPTY = { title: '', description: '', price: '', stock: '', categoryId: 1 };

function ProductsTab() {
  const [products, setProducts] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });

  const say = (text, ok = false) => setMsg({ text, ok });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const load = () =>
    api.get('/products/mine/list')
      .then((r) => setProducts(r.data.filter((p) => p.isActive)))
      .catch((e) => say(errorMessage(e)));

  useEffect(() => { load(); }, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      price: String(p.pricePaise / 100),
      stock: String(p.stock),
      categoryId: p.categoryId ?? 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save(e) {
    e.preventDefault();
    const body = {
      title: form.title,
      description: form.description,
      pricePaise: Math.round(Number(form.price) * 100), // the API wants paise
      stock: Number(form.stock),
      categoryId: Number(form.categoryId),
    };
    try {
      if (editingId) await api.put(`/products/${editingId}`, body);
      else await api.post('/products', body);
      say(editingId ? 'Product updated' : 'Product added', true);
      reset();
      load();
    } catch (err) {
      say(errorMessage(err));
    }
  }

  async function remove(id) {
    if (!window.confirm('Remove this product from the store?')) return;
    try {
      await api.delete(`/products/${id}`);
      say('Product removed', true);
      load();
    } catch (err) {
      say(errorMessage(err));
    }
  }

  async function upload(id, files) {
    if (!files.length) return;
    const data = new FormData();
    for (const f of files) data.append('images', f);
    try {
      // do not set Content-Type by hand, the browser adds the multipart boundary
      await api.post(`/products/${id}/images`, data);
      say('Images uploaded', true);
      load();
    } catch (err) {
      say(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="bg-white rounded shadow p-4 grid gap-3 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">{editingId ? `Edit product #${editingId}` : 'Add a product'}</h2>
        <input required minLength={3} placeholder="Title" className="border rounded p-2 md:col-span-2" value={form.title} onChange={set('title')} />
        <textarea required minLength={10} placeholder="Description (min 10 characters)" rows={3} className="border rounded p-2 md:col-span-2" value={form.description} onChange={set('description')} />
        <input required type="number" min="1" step="0.01" placeholder="Price in ₹" className="border rounded p-2" value={form.price} onChange={set('price')} />
        <input required type="number" min="0" step="1" placeholder="Stock" className="border rounded p-2" value={form.stock} onChange={set('stock')} />
        <select className="border rounded p-2" value={form.categoryId} onChange={set('categoryId')}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="bg-indigo-600 text-white rounded px-4 py-2">{editingId ? 'Save changes' : 'Add product'}</button>
          {editingId && <button type="button" onClick={reset} className="border rounded px-4 py-2">Cancel</button>}
        </div>
        {msg.text && <p className={`text-sm md:col-span-2 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
      </form>

      {!products && <p>Loading...</p>}
      {products?.length === 0 && <p className="text-gray-500">No products yet. Add your first one above.</p>}

      <div className="space-y-3">
        {products?.map((p) => (
          <div key={p.id} className="bg-white rounded shadow p-3 flex gap-3 items-center flex-wrap">
            {p.images[0] ? (
              <img src={p.images[0].url} alt="" className="h-16 w-16 object-cover rounded" />
            ) : (
              <div className="h-16 w-16 bg-gray-100 rounded" />
            )}
            <div className="flex-1 min-w-40">
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-gray-600">
                {rupees(p.pricePaise)} · stock {p.stock} · {p.images.length} image(s)
              </p>
            </div>
            <label className="text-sm text-indigo-600 cursor-pointer">
              Upload images
              <input
                type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                onChange={(e) => { upload(p.id, e.target.files); e.target.value = ''; }}
              />
            </label>
            <button onClick={() => startEdit(p)} className="text-sm">Edit</button>
            <button onClick={() => remove(p.id)} className="text-sm text-red-600">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api.get('/orders/vendor/items').then((r) => setItems(r.data)).catch((e) => setError(errorMessage(e)));

  useEffect(() => { load(); }, []);

  async function move(id, status) {
    setError('');
    try {
      await api.patch(`/orders/items/${id}/status`, { status });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!items) return <p>{error || 'Loading...'}</p>;

  return (
    <div className="space-y-3">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {items.length === 0 && <p className="text-gray-500">No paid orders yet.</p>}
      {items.map((i) => (
        <div key={i.id} className="bg-white rounded shadow p-3">
          <div className="flex justify-between gap-2">
            <p className="font-medium">{i.product.title} × {i.quantity}</p>
            <p className="text-sm font-semibold">{i.status}</p>
          </div>
          <p className="text-xs text-gray-500">Order #{i.orderId} · {i.order.address}</p>
          <p className="text-sm mt-1">
            You earn {rupees(i.vendorEarnPaise)}
            <span className="text-gray-500"> (platform commission {rupees(i.commissionPaise)})</span>
          </p>
          <div className="flex gap-2 mt-2">
            {(NEXT[i.status] || []).map((s) => (
              <button
                key={s} onClick={() => move(i.id, s)}
                className={`text-sm rounded px-3 py-1 ${s === 'CANCELLED' ? 'border text-red-600' : 'bg-indigo-600 text-white'}`}
              >
                Mark {s.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Vendor() {
  const [vendor, setVendor] = useState(undefined); // undefined = loading, null = not applied
  const [tab, setTab] = useState('products');

  const load = () =>
    api.get('/vendors/me')
      .then((r) => setVendor(r.data))
      .catch((err) => setVendor(err.response?.status === 404 ? null : undefined));

  useEffect(() => { load(); }, []);

  if (vendor === undefined) return <p className="p-6">Loading...</p>;
  if (vendor === null) return <ApplyForm onDone={load} />;

  if (vendor.status !== 'APPROVED') {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold">{vendor.storeName}</h1>
        <p className="mt-2">
          Your store is <b>{vendor.status}</b>.
          {vendor.status === 'PENDING' && ' An admin will review it soon.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold">{vendor.storeName}</h1>
      <p className="text-sm text-gray-500 mb-4">Platform commission: {vendor.commissionPercent}%</p>
      <div className="flex gap-4 border-b mb-4">
        {['products', 'orders'].map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`pb-2 capitalize ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'products' ? <ProductsTab /> : <OrdersTab />}
    </div>
  );
}