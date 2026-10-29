import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { ADDRESS, auth, cleanup, makeProduct, makeUser, makeVendor } from './helpers.js';

let vendor, customer, product;

beforeAll(async () => {
  vendor = await makeVendor('vendor');
  customer = await makeUser('customer', 'CUSTOMER');
  product = await makeProduct(vendor.vendor.id, { stock: 5 });
});
afterAll(cleanup);

const addToCart = (token, productId, quantity) =>
  request(app).post('/api/cart/items').set(auth(token)).send({ productId, quantity });
const checkout = (token, body = {}) =>
  request(app).post('/api/orders/checkout').set(auth(token)).send({ address: ADDRESS, ...body });

describe('cart', () => {
  it('adds an item and computes the subtotal from the database price', async () => {
    const res = await addToCart(customer.token, product.id, 2);
    expect(res.status).toBe(201);
    expect(res.body.subtotalPaise).toBe(200000);
  });

  it('rejects a quantity above stock', async () => {
    const res = await addToCart(customer.token, product.id, 4); // 2 already in cart + 4 > 5
    expect(res.status).toBe(409);
  });

  it('blocks vendors from using the cart', async () => {
    const res = await request(app).get('/api/cart').set(auth(vendor.token));
    expect(res.status).toBe(403);
  });

  it('blocks anonymous users', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });
});

describe('checkout', () => {
  let order;

  it('creates an order with the correct commission split', async () => {
    const res = await checkout(customer.token);
    expect(res.status).toBe(201);
    order = res.body;
    expect(order.totalPaise).toBe(200000);
    expect(order.items[0].commissionPaise).toBe(20000); // 10% of 200000
    expect(order.items[0].vendorEarnPaise).toBe(180000);
  });

  it('reduces stock and empties the cart', async () => {
    const p = await prisma.product.findUnique({ where: { id: product.id } });
    expect(p.stock).toBe(3);
    const cart = await request(app).get('/api/cart').set(auth(customer.token));
    expect(cart.body.items).toHaveLength(0);
  });

  it('rejects checkout with an empty cart', async () => {
    expect((await checkout(customer.token)).status).toBe(400);
  });

  it('hides unpaid orders from the vendor', async () => {
    const res = await request(app).get('/api/orders/vendor/items').set(auth(vendor.token));
    expect(res.status).toBe(200);
    expect(res.body.find((i) => i.orderId === order.id)).toBeUndefined();
  });

  it('never oversells the last item when two customers buy at once', async () => {
    const last = await makeProduct(vendor.vendor.id, { stock: 1 });
    const a = await makeUser('buyerA', 'CUSTOMER');
    const b = await makeUser('buyerB', 'CUSTOMER');
    await addToCart(a.token, last.id, 1);
    await addToCart(b.token, last.id, 1);

    const results = await Promise.all([checkout(a.token), checkout(b.token)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);

    const p = await prisma.product.findUnique({ where: { id: last.id } });
    expect(p.stock).toBe(0);
  });
});