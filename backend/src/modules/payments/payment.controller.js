import crypto from 'crypto';
import { z } from 'zod';
import * as paymentService from './payment.service.js';

export const orderSchema = z.object({ orderId: z.number().int().positive() });

export const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function create(req, res) {
  res.json(await paymentService.createPayment(req.user.id, req.body.orderId));
}

export async function verify(req, res) {
  res.json(await paymentService.verify(req.user.id, req.body));
}

export async function cancel(req, res) {
  res.json(await paymentService.cancelUnpaid(req.user.id, req.body.orderId));
}

// Razorpay calls this itself, so there is no login. The signature is the proof.
// req.body is a raw Buffer here (see app.js).
export async function webhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(req.body)
    .digest('hex');

  if (!signature || !paymentService.safeEqual(expected, signature)) {
    return res.status(400).json({ error: 'Bad signature' });
  }

  try {
    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment.captured') {
      const p = event.payload.payment.entity;
      await paymentService.markPaid(p.order_id, p.id);
    }
  } catch (err) {
    console.error('webhook error:', err.message); // still reply 200 so Razorpay does not retry forever
  }
  res.json({ ok: true });
}