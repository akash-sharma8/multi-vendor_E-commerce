import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { ADDRESS, auth, cleanup, makeProduct, makeUser, makeVendor, tag } from './helpers.js';

let admin, vendor, c1, c2, product;
const CODE = `${tag.toUpperCase()}A`;

beforeAll(async () => {
  admin = await makeUser('admin', 'ADMIN');
  vendor = await makeVendor('vendor');
  c1 = await makeUser('c1', 'CUSTOMER');
  c2 = await makeUser('c2', 'CUSTOMER');
  product = await makeProduct(vendor.vendor.id, { stock: 20 });
});
afterAll(cleanup);

const add = (t) =>
  request(app).post('/api/cart/items').set(auth(t)).send({ productId: product.id, quantity: 1 });
const checkout = (t, couponCode) =>
  request(app).post('/api/orders/checkout').set(auth(t)).send({ address: ADDRESS, couponCode });

describe('coupons', () => {
  it('only admins can create coupons', async () => {
    const res = await request(app).post('/api/coupons').set(auth(c1.token))
      .send({ code: CODE, discountPercent: 20, maxUses: 1 });
    expect(res.status).toBe(403);
  });

  it('creates a coupon and rejects a duplicate code', async () => {
    const body = { code: CODE, discountPercent: 20, maxUses: 1 };
    expect((await request(app).post('/api/coupons').set(auth(admin.token)).send(body)).status).toBe(201);
    expect((await request(app).post('/api/coupons').set(auth(admin.token)).send(body)).status).toBe(409);
  });

  it('previews the discount without using the coupon', async () => {
    await add(c1.token);
    const res = await request(app).post('/api/coupons/preview').set(auth(c1.token)).send({ code: CODE.toLowerCase() });
    expect(res.status).toBe(200);
    expect(res.body.discountPaise).toBe(20000);
    expect(res.body.totalPaise).toBe(80000);
    const c = await prisma.coupon.findUnique({ where: { code: CODE } });
    expect(c.usedCount).toBe(0);
  });

  it('rejects an unknown coupon at checkout', async () => {
    expect((await checkout(c1.token, 'NOSUCHCODE')).status).toBe(400);
  });

  let order;
  it('applies the discount at checkout', async () => {
    const res = await checkout(c1.token, CODE);
    expect(res.status).toBe(201);
    order = res.body;
    expect(order.discountPaise).toBe(20000);
    expect(order.totalPaise).toBe(80000);
    expect(order.items[0].vendorEarnPaise).toBe(90000); // vendor is not affected by the coupon
  });

  it('refuses the coupon once max uses is reached', async () => {
    await add(c2.token);
    expect((await checkout(c2.token, CODE)).status).toBe(400);
  });

  it('gives the use back when the unpaid order is cancelled', async () => {
    const cancel = await request(app).post('/api/payments/cancel').set(auth(c1.token)).send({ orderId: order.id });
    expect(cancel.status).toBe(200);
    const c = await prisma.coupon.findUnique({ where: { code: CODE } });
    expect(c.usedCount).toBe(0);
    expect((await checkout(c2.token, CODE)).status).toBe(201);
  });
});