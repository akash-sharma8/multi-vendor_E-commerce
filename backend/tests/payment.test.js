import crypto from 'crypto';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { ADDRESS, auth, cleanup, makeProduct, makeUser, makeVendor, tag } from './helpers.js';

let vendor, customer, other, product;

beforeAll(async () => {
  vendor = await makeVendor('vendor');
  customer = await makeUser('customer', 'CUSTOMER');
  other = await makeUser('other', 'CUSTOMER');
  product = await makeProduct(vendor.vendor.id, { stock: 20 });
});
afterAll(cleanup);

const sign = (orderId, paymentId) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

// checkout, then fake the Razorpay order row (we cannot open the popup in a test)
async function newOrder() {
  await request(app).post('/api/cart/items').set(auth(customer.token)).send({ productId: product.id, quantity: 1 });
  const res = await request(app).post('/api/orders/checkout').set(auth(customer.token)).send({ address: ADDRESS });
  const order = res.body;
  const rzpOrderId = `order_${tag}_${order.id}`;
  await prisma.payment.create({
    data: { orderId: order.id, razorpayOrderId: rzpOrderId, amountPaise: order.totalPaise },
  });
  return { order, rzpOrderId, itemId: order.items[0].id };
}

const verify = (token, rzpOrderId, paymentId, signature) =>
  request(app).post('/api/payments/verify').set(auth(token)).send({
    razorpay_order_id: rzpOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  });

describe('payment verification', () => {
  let paid;

  beforeAll(async () => { paid = await newOrder(); });

  it('rejects a wrong signature', async () => {
    const res = await verify(customer.token, paid.rzpOrderId, 'pay_1', 'bad-signature');
    expect(res.status).toBe(400);
    const o = await prisma.order.findUnique({ where: { id: paid.order.id } });
    expect(o.paymentStatus).toBe('CREATED');
  });

  it("does not let another customer verify someone else's payment", async () => {
    const res = await verify(other.token, paid.rzpOrderId, 'pay_1', sign(paid.rzpOrderId, 'pay_1'));
    expect(res.status).toBe(404);
  });

  it('accepts a valid signature, marks PAID and records the vendor payout', async () => {
    const res = await verify(customer.token, paid.rzpOrderId, 'pay_1', sign(paid.rzpOrderId, 'pay_1'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');

    const o = await prisma.order.findUnique({ where: { id: paid.order.id } });
    expect(o.paymentStatus).toBe('PAID');
    const payouts = await prisma.payout.findMany({ where: { vendorId: vendor.vendor.id } });
    expect(payouts).toHaveLength(1);
    expect(payouts[0].amountPaise).toBe(90000); // 100000 minus 10% commission
  });

  it('is idempotent: verifying twice does not create a second payout', async () => {
    const res = await verify(customer.token, paid.rzpOrderId, 'pay_1', sign(paid.rzpOrderId, 'pay_1'));
    expect(res.status).toBe(200);
    const count = await prisma.payout.count({ where: { vendorId: vendor.vendor.id } });
    expect(count).toBe(1);
  });

  it('cannot cancel an order that is already paid', async () => {
    const res = await request(app).post('/api/payments/cancel').set(auth(customer.token)).send({ orderId: paid.order.id });
    expect(res.status).toBe(409);
  });
});

describe('order lifecycle and reviews', () => {
  let paid;
  const move = (itemId, status) =>
    request(app).patch(`/api/orders/items/${itemId}/status`).set(auth(vendor.token)).send({ status });

  beforeAll(async () => {
    paid = await newOrder();
    await verify(customer.token, paid.rzpOrderId, 'pay_2', sign(paid.rzpOrderId, 'pay_2'));
  });

  it('shows the paid order to the vendor', async () => {
    const res = await request(app).get('/api/orders/vendor/items').set(auth(vendor.token));
    expect(res.body.some((i) => i.id === paid.itemId)).toBe(true);
  });

  it('does not allow skipping a status', async () => {
    expect((await move(paid.itemId, 'DELIVERED')).status).toBe(400);
  });

  it('does not allow another vendor to touch the item', async () => {
    const rival = await makeVendor('rival');
    const res = await request(app).patch(`/api/orders/items/${paid.itemId}/status`)
      .set(auth(rival.token)).send({ status: 'PACKED' });
    expect(res.status).toBe(404);
  });

  it('blocks a review before delivery', async () => {
    const res = await request(app).post(`/api/products/${product.id}/reviews`)
      .set(auth(other.token)).send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('walks PACKED, SHIPPED, DELIVERED', async () => {
    for (const status of ['PACKED', 'SHIPPED', 'DELIVERED']) {
      expect((await move(paid.itemId, status)).status).toBe(200);
    }
  });

  it('accepts one review after delivery, rejects invalid rating and duplicates', async () => {
    const post = (body) =>
      request(app).post(`/api/products/${product.id}/reviews`).set(auth(customer.token)).send(body);
    expect((await post({ rating: 9 })).status).toBe(400);
    expect((await post({ rating: 5, comment: 'Great' })).status).toBe(201);
    expect((await post({ rating: 4 })).status).toBe(409);

    const list = await request(app).get(`/api/products/${product.id}/reviews`);
    expect(list.body.count).toBe(1);
    expect(list.body.average).toBe(5);
  });
});

describe('unpaid orders', () => {
  it('stay invisible to vendors, and cancelling puts the stock back', async () => {
    const before = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
    const unpaid = await newOrder();

    const mid = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
    expect(mid).toBe(before - 1);

    const hidden = await request(app).patch(`/api/orders/items/${unpaid.itemId}/status`)
      .set(auth(vendor.token)).send({ status: 'PACKED' });
    expect(hidden.status).toBe(404);

    const res = await request(app).post('/api/payments/cancel').set(auth(customer.token)).send({ orderId: unpaid.order.id });
    expect(res.status).toBe(200);

    const after = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
    expect(after).toBe(before);
  });
});