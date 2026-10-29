import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/db.js';
import redis from '../src/config/redis.js';
import es, { INDEX } from '../src/config/elastic.js';

export const tag = `t${Date.now()}${Math.floor(Math.random() * 1000)}`;
export const ADDRESS = '12 MG Road, Lucknow 226001';
export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export async function makeUser(label, role) {
  const passwordHash = await bcrypt.hash('Test@1234', 4);
  const user = await prisma.user.create({
    data: { name: label, email: `${tag}-${label}@test.com`, passwordHash, role },
  });
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
}

export async function makeVendor(label) {
  const { user, token } = await makeUser(label, 'VENDOR');
  const vendor = await prisma.vendorProfile.create({
    data: { userId: user.id, storeName: `${tag} ${label}`, status: 'APPROVED', commissionPercent: 10 },
  });
  return { user, vendor, token };
}

export function makeProduct(vendorId, extra = {}) {
  return prisma.product.create({
    data: {
      vendorId,
      title: `${tag} product`,
      description: 'test product description',
      pricePaise: 100000,
      stock: 10,
      ...extra,
    },
  });
}

// deletes everything this test file created, in foreign-key order
export async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: tag } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const vendors = await prisma.vendorProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const vendorIds = vendors.map((v) => v.id);
  const products = await prisma.product.findMany({ where: { vendorId: { in: vendorIds } }, select: { id: true } });
  const orders = await prisma.order.findMany({ where: { customerId: { in: userIds } }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);

  await prisma.review.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.payout.deleteMany({ where: { vendorId: { in: vendorIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.coupon.deleteMany({ where: { code: { startsWith: tag.toUpperCase() } } });
  await prisma.product.deleteMany({ where: { vendorId: { in: vendorIds } } });
  await prisma.vendorProfile.deleteMany({ where: { id: { in: vendorIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  for (const id of userIds) await redis.del(`cart:${id}`);
  for (const p of products) {
    await es.delete({ index: INDEX, id: String(p.id) }, { ignore: [404] }).catch(() => {});
  }
  redis.disconnect();
  await es.close();
  await prisma.$disconnect();
}