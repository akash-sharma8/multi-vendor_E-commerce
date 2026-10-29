import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { errorMessage, rupees } from '../api/client.js';
import { payForOrder } from '../api/razorpay.js';
import { useAuth } from '../context/AuthContext.jsx';

const BADGE = {
  PLACED: 'bg-blue-100 text-blue-700',
  PACKED: 'bg-yellow-100 text-yellow-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-200 text-gray-600',
};

function ReviewForm({ productId }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: true });

  async function submit() {
    try {
      await api.post(`/products/${productId}/reviews`, { rating, comment: comment || undefined });
      setMsg({ text: 'Thanks for your review!', ok: true });
      setOpen(false);
    } catch (err) {
      setMsg({ text: errorMessage(err), ok: false });
    }
  }

  return (
    <div className="mt-1">
      {!open && (
        <button onClick={() => setOpen(true)} className="text-xs text-indigo-600">Write a review</button>
      )}
      {open && (
        <div className="flex flex-wrap gap-2 items-center mt-1">
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border rounded p-1 text-sm">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
          </select>
          <input
            placeholder="Comment (optional)" maxLength={500}
            className="border rounded p-1 text-sm flex-1 min-w-40"
            value={comment} onChange={(e) => setComment(e.target.value)}
          />
          <button onClick={submit} className="bg-indigo-600 text-white rounded px-3 py-1 text-sm">Submit</button>
        </div>
      )}
      {msg.text && <p className={`text-xs ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api.get('/orders').then((r) => setOrders(r.data)).catch((e) => setNotice(errorMessage(e)));

  useEffect(() => { load(); }, []);

  async function payNow(orderId) {
    setBusyId(orderId);
    try {
      const result = await payForOrder(orderId, user);
      setNotice(result === 'PAID' ? 'Payment successful!' : 'Payment was not completed.');
    } catch (err) {
      setNotice(errorMessage(err));
    }
    setBusyId(null);
    load();
  }

  async function cancel(orderId) {
    if (!window.confirm('Cancel this order?')) return;
    setBusyId(orderId);
    try {
      await api.post('/payments/cancel', { orderId });
      setNotice('Order cancelled');
    } catch (err) {
      setNotice(errorMessage(err));
    }
    setBusyId(null);
    load();
  }

  // the invoice route needs the login token, so a plain link will not work
  async function downloadInvoice(orderId) {
    try {
      const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice('Could not download the invoice');
    }
  }

  if (!orders) return <p className="p-6">{notice || 'Loading...'}</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">My orders</h1>
      {notice && <p className="bg-indigo-50 text-indigo-800 text-sm rounded p-3">{notice}</p>}
      {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}

      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">Order #{o.id}</p>
              <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{rupees(o.totalPaise)}</p>
              <p className={`text-xs ${o.paymentStatus === 'PAID' ? 'text-green-600' : 'text-orange-600'}`}>
                {o.paymentStatus === 'CREATED' ? 'PAYMENT PENDING' : o.paymentStatus}
              </p>
            </div>
          </div>

          <div className="mt-3 divide-y">
            {o.items.map((i) => (
              <div key={i.id} className="py-2 text-sm">
                <div className="flex justify-between items-center gap-2">
                  <span className="truncate">{i.product.title} × {i.quantity}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${BADGE[i.status]}`}>{i.status}</span>
                </div>
                {i.status === 'DELIVERED' && <ReviewForm productId={i.productId} />}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-3 text-sm">
            {o.paymentStatus === 'CREATED' && (
              <>
                <button
                  disabled={busyId === o.id} onClick={() => payNow(o.id)}
                  className="bg-indigo-600 text-white rounded px-3 py-1 disabled:opacity-50"
                >
                  Pay now
                </button>
                <button disabled={busyId === o.id} onClick={() => cancel(o.id)} className="text-red-600">
                  Cancel order
                </button>
              </>
            )}
            {o.paymentStatus === 'PAID' && (
              <button onClick={() => downloadInvoice(o.id)} className="text-indigo-600">
                Download invoice
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}