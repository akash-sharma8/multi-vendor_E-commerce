import crypto from 'crypto';
import razorpay from '../../config/razorpay.js';
import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import { syncProduct } from '../search/search.service.js';

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Step 1: ask Razorpay for an order id. The amount comes from OUR database, never from the client.
export async function createPayment(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: userId },
    include: { payment: true },
  });
  if (!order) throw new AppError('Order not found', 404);
  if (order.paymentStatus !== 'CREATED') {
    throw new AppError(`Order is already ${order.paymentStatus}`, 409);
  }

  let payment = order.payment;
  if (!payment) {
    const rzp = await razorpay.orders.create({
      amount: order.totalPaise,
      currency: 'INR',
      receipt: `order_${order.id}`,
    });
    payment = await prisma.payment.create({
      data: { orderId: order.id, razorpayOrderId: rzp.id, amountPaise: order.totalPaise },
    });
  }

  return {
    orderId: order.id,
    razorpayOrderId: payment.razorpayOrderId,
    amountPaise: payment.amountPaise,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

// Marks an order paid and records what each vendor earned.
// Safe to call twice (verify + webhook): only the first call changes anything.
export async function markPaid(razorpayOrderId, razorpayPaymentId) {
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
  if (!payment) throw new AppError('Payment not found', 404);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: payment.orderId, paymentStatus: 'CREATED' },
      data: { paymentStatus: 'PAID' },
    });
    if (claimed.count === 0) return; // already handled

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', razorpayPaymentId },
    });

    const items = await tx.orderItem.findMany({
      where: { orderId: payment.orderId, status: { not: 'CANCELLED' } },
    });
    const earnings = new Map();
    for (const item of items) {
      earnings.set(item.vendorId, (earnings.get(item.vendorId) || 0) + item.vendorEarnPaise);
    }
    await tx.payout.createMany({
      data: [...earnings].map(([vendorId, amountPaise]) => ({ vendorId, amountPaise })),
    });
  });
}

// Step 2: the browser sends back 3 values. We recompute the signature with our secret.
export async function verify(userId, body) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
    include: { order: true },
  });
  if (!payment || payment.order.customerId !== userId) {
    throw new AppError('Payment not found', 404);
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (!safeEqual(expected, razorpay_signature)) {
    throw new AppError('Invalid payment signature', 400);
  }

  await markPaid(razorpay_order_id, razorpay_payment_id);
  return { status: 'PAID', orderId: payment.orderId };
}

// Customer gives up before paying: cancel the order and put the stock back.
export async function cancelUnpaid(userId, orderId) {
  const items = await prisma.orderItem.findMany({
    where: { orderId, order: { customerId: userId } },
  });

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, customerId: userId, paymentStatus: 'CREATED' },
      data: { paymentStatus: 'FAILED' },
    });
    if (claimed.count === 0) throw new AppError('Order not found or already paid', 409);

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.orderItem.updateMany({ where: { orderId }, data: { status: 'CANCELLED' } });
  });

  for (const item of items) await syncProduct(item.productId);
  return { status: 'CANCELLED', orderId };
}