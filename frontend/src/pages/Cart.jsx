import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage, rupees } from '../api/client.js';
import { payForOrder } from '../api/razorpay.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [busy, setBusy] = useState(false);

  const say = (text, ok = false) => setMsg({ text, ok });

  useEffect(() => {
    api.get('/cart').then((r) => setCart(r.data)).catch((e) => say(errorMessage(e)));
  }, []);

  // any cart change makes an applied coupon preview stale
  async function change(request) {
    try {
      const res = await request();
      setCart(res.data);
      setCoupon(null);
      say('');
    } catch (err) {
      say(errorMessage(err));
    }
  }

  const setQty = (productId, quantity) =>
    change(() => api.patch(`/cart/items/${productId}`, { quantity }));
  const removeItem = (productId) => change(() => api.delete(`/cart/items/${productId}`));

  async function applyCoupon() {
    try {
      const res = await api.post('/coupons/preview', { code });
      setCoupon(res.data);
      say(`Coupon ${res.data.code} applied`, true);
    } catch (err) {
      setCoupon(null);
      say(errorMessage(err));
    }
  }

  async function checkout() {
    setBusy(true);
    say('');
    let order;
    try {
      const body = { address };
      if (coupon) body.couponCode = coupon.code;
      order = (await api.post('/orders/checkout', body)).data;
    } catch (err) {
      say(errorMessage(err));
      setBusy(false);
      return;
    }

    // the order exists now, so whatever happens next we land on My orders
    let notice;
    try {
      const result = await payForOrder(order.id, user);
      notice =
        result === 'PAID'
          ? 'Payment successful!'
          : 'Order created but not paid yet. You can pay or cancel it below.';
    } catch (err) {
      notice = `Payment problem: ${errorMessage(err)}. You can retry from here.`;
    }
    navigate('/orders', { state: { notice } });
  }

  if (!cart) return <p className="p-6">{msg.text || 'Loading...'}</p>;

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p>Your cart is empty.</p>
        <Link to="/" className="text-indigo-600">Browse products</Link>
      </div>
    );
  }

  const discount = coupon?.discountPaise ?? 0;
  const total = cart.subtotalPaise - discount;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-3">
        <h1 className="text-xl font-semibold">Your cart</h1>
        {cart.items.map((i) => (
          <div key={i.productId} className="bg-white rounded shadow p-3 flex gap-3 items-center">
            {i.imageUrl ? (
              <img src={i.imageUrl} alt="" className="h-16 w-16 object-cover rounded" />
            ) : (
              <div className="h-16 w-16 bg-gray-100 rounded" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{i.title}</p>
              <p className="text-xs text-gray-500">{i.storeName}</p>
              <p className="text-sm">{rupees(i.unitPricePaise)}</p>
            </div>
            <input
              type="number" min="1" max="10" value={i.quantity}
              onChange={(e) => setQty(i.productId, Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              className="border rounded p-1 w-16"
            />
            <p className="w-24 text-right font-medium">{rupees(i.linePaise)}</p>
            <button onClick={() => removeItem(i.productId)} className="text-red-600 text-sm">Remove</button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded shadow p-4 space-y-3 h-fit">
        <h2 className="font-semibold">Order summary</h2>
        <div className="flex gap-2">
          <input
            placeholder="Coupon code" className="border rounded p-2 flex-1 min-w-0"
            value={code} onChange={(e) => setCode(e.target.value)}
          />
          <button onClick={applyCoupon} disabled={!code.trim()} className="border rounded px-3 disabled:opacity-40">
            Apply
          </button>
        </div>

        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{rupees(cart.subtotalPaise)}</span></div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({coupon.discountPercent}%)</span><span>- {rupees(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-1 border-t">
            <span>Total</span><span>{rupees(total)}</span>
          </div>
        </div>

        <textarea
          placeholder="Full delivery address (house, street, city, pincode)"
          rows={3} className="border rounded p-2 w-full text-sm"
          value={address} onChange={(e) => setAddress(e.target.value)}
        />
        {msg.text && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button
          onClick={checkout}
          disabled={busy || address.trim().length < 10}
          className="w-full bg-indigo-600 text-white rounded p-2 disabled:opacity-50"
        >
          {busy ? 'Please wait...' : `Pay ${rupees(total)}`}
        </button>
      </div>
    </div>
  );
}