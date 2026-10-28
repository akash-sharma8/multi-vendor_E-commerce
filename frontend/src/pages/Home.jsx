import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { rupees } from '../api/client.js';

// ids follow the order of the seed script
const CATEGORIES = [
  { id: 1, name: 'Electronics' },
  { id: 2, name: 'Clothing' },
  { id: 3, name: 'Books' },
  { id: 4, name: 'Home' },
  { id: 5, name: 'Beauty' },
];

export default function Home() {
  const [filters, setFilters] = useState({
    q: '', categoryId: '', minPrice: '', maxPrice: '', sort: '',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const change = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  // wait 300ms after the last keystroke before calling the API
  useEffect(() => {
    const params = { page, limit: 12 };
    for (const [key, value] of Object.entries(filters)) {
      if (value !== '') params[key] = value;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      api
        .get('/search', { params })
        .then((res) => { setData(res.data); setError(''); })
        .catch(() => setError('Could not load products'))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, page]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid gap-3 md:grid-cols-5 mb-6">
        <input
          placeholder="Search products..." className="border rounded p-2 md:col-span-2"
          value={filters.q} onChange={change('q')}
        />
        <select className="border rounded p-2" value={filters.categoryId} onChange={change('categoryId')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border rounded p-2" value={filters.sort} onChange={change('sort')}>
          <option value="">Best match</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
        <div className="flex gap-2">
          <input type="number" min="0" placeholder="Min ₹" className="border rounded p-2 w-1/2" value={filters.minPrice} onChange={change('minPrice')} />
          <input type="number" min="0" placeholder="Max ₹" className="border rounded p-2 w-1/2" value={filters.maxPrice} onChange={change('maxPrice')} />
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && !error && data.items.length === 0 && (
        <p className="text-gray-500">No products found.</p>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {data.items.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="bg-white rounded shadow hover:shadow-md overflow-hidden">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.title} className="h-40 w-full object-cover" />
            ) : (
              <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">No image</div>
            )}
            <div className="p-3">
              <p className="font-medium truncate">{p.title}</p>
              <p className="text-indigo-600 font-semibold">{rupees(p.pricePaise)}</p>
              <p className="text-xs text-gray-500">{p.storeName}</p>
              {p.stock === 0 && <p className="text-xs text-red-600">Out of stock</p>}
            </div>
          </Link>
        ))}
      </div>

      {data.pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span className="text-sm">Page {page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}