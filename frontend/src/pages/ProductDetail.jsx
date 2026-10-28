import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage, rupees } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState({ average: null, count: 0, reviews: [] });
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState({ text: '', ok: true });
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => setNotFound(true));
    api.get(`/products/${id}/reviews`).then((r) => setReviews(r.data)).catch(() => {});
  }, [id]);

  async function addToCart() {
    if (!user) return navigate('/login');
    try {
      await api.post('/cart/items', { productId: product.id, quantity: qty });
      setMessage({ text: 'Added to cart', ok: true });
    } catch (err) {
      setMessage({ text: errorMessage(err), ok: false });
    }
  }

  if (notFound) return <p className="p-6">Product not found.</p>;
  if (!product) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-8">
      <div className="space-y-2">
        {product.images.length ? (
          product.images.map((img) => (
            <img key={img.id} src={img.url} alt={product.title} className="w-full rounded" />
          ))
        ) : (
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">No image</div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <p className="text-sm text-gray-500">Sold by {product.vendor.storeName}</p>
        {reviews.count > 0 && (
          <p className="mt-1 text-sm">★ {reviews.average} ({reviews.count} reviews)</p>
        )}
        <p className="text-2xl text-indigo-600 font-bold mt-3">{rupees(product.pricePaise)}</p>
        <p className="mt-4 text-gray-700">{product.description}</p>
        <p className="mt-2 text-sm">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>

        {(!user || user.role === 'CUSTOMER') && product.stock > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="number" min="1" max="10" value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="border rounded p-2 w-20"
            />
            <button onClick={addToCart} className="bg-indigo-600 text-white rounded px-4 py-2">
              Add to cart
            </button>
          </div>
        )}
        {message.text && (
          <p className={`mt-2 text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
        )}

        <h2 className="font-semibold mt-8 mb-2">Reviews</h2>
        {reviews.reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
        {reviews.reviews.map((r) => (
          <div key={r.id} className="border-b py-2">
            <p className="text-sm font-medium">{r.user.name} · {'★'.repeat(r.rating)}</p>
            {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}