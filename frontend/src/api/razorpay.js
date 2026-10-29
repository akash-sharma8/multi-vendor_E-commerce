import api from './client.js';

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay, check your internet'));
    document.body.appendChild(s);
  });
}

// Resolves 'PAID' or 'DISMISSED' (user closed the popup). Rejects on a real error.
export async function payForOrder(orderId, user) {
  await loadScript();
  const { data } = await api.post('/payments/create', { orderId });

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: data.keyId,
      order_id: data.razorpayOrderId,
      amount: data.amountPaise,
      currency: 'INR',
      name: 'Marketplace',
      prefill: { name: user.name, email: user.email },
      handler: async (response) => {
        try {
          // the server checks the signature, we never trust the popup alone
          await api.post('/payments/verify', response);
          resolve('PAID');
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => resolve('DISMISSED') },
    });
    rzp.open();
  });
}