import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import { getCart } from '../cart/cart.service.js';

const clean = (code) => String(code).trim().toUpperCase();
const discountOf = (subtotalPaise, coupon) =>
  Math.floor((subtotalPaise * coupon.discountPercent) / 100);

async function findUsable(db, code) {
  const coupon = await db.coupon.findUnique({ where: { code: clean(code) } });
  if (!coupon || !coupon.isActive) throw new AppError('Invalid coupon', 400);
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError('Coupon expired', 400);
  }
  if (coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Coupon usage limit reached', 400);
  }
  return coupon;
}

// Admin
export async function create({ code, discountPercent, maxUses, expiresAt }) {
  const existing = await prisma.coupon.findUnique({ where: { code: clean(code) } });
  if (existing) throw new AppError('Coupon code already exists', 409);

  return prisma.coupon.create({
    data: { code: clean(code), discountPercent, maxUses, expiresAt },
  });
}

export async function list() {
  return prisma.coupon.findMany({ orderBy: { id: 'desc' } });
}

// Customer: show the discount on the current cart without using the coupon
export async function preview(userId, code) {
  const { subtotalPaise } = await getCart(userId);
  if (subtotalPaise === 0) throw new AppError('Your cart is empty', 400);

  const coupon = await findUsable(prisma, code);
  const discountPaise = discountOf(subtotalPaise, coupon);
  return {
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    subtotalPaise,
    discountPaise,
    totalPaise: subtotalPaise - discountPaise,
  };
}

// Used inside the checkout transaction: really consumes one use.
export async function claim(tx, code, subtotalPaise) {
  const coupon = await findUsable(tx, code);

  const claimed = await tx.coupon.updateMany({
    where: { id: coupon.id, usedCount: { lt: coupon.maxUses } },
    data: { usedCount: { increment: 1 } },
  });
  if (claimed.count === 0) throw new AppError('Coupon usage limit reached', 400);

  return { couponId: coupon.id, discountPaise: discountOf(subtotalPaise, coupon) };
}