import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import * as cartService from '../cart/cart.service.js';
import { syncProduct } from '../search/search.service.js';
import * as couponService from '../coupons/coupon.service.js';


export async function checkout(userId, { address, couponCode }) {
  const { items, subtotalPaise } = await cartService.getCart(userId);
  if (!items.length) throw new AppError('Your cart is empty', 400);

  const order = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw new AppError(`"${item.title}" is out of stock`, 409);
      }
    }

    let couponId = null;
    let discountPaise = 0;
    if (couponCode) {
      ({ couponId, discountPaise } = await couponService.claim(tx, couponCode, subtotalPaise));
    }

    return tx.order.create({
      data: {
        customerId: userId,
        couponId,
        address,
        subtotalPaise,
        discountPaise,
        totalPaise: subtotalPaise - discountPaise,
        items: {
          create: items.map((item) => {
            const commissionPaise = Math.round(
              (item.linePaise * item.commissionPercent) / 100
            );
            return {
              productId: item.productId,
              vendorId: item.vendorId,
              quantity: item.quantity,
              unitPricePaise: item.unitPricePaise,
              commissionPaise,
              vendorEarnPaise: item.linePaise - commissionPaise,
            };
          }),
        },
      },
      include: { items: true },
    });
  });

  await cartService.clear(userId);
  for (const item of items) await syncProduct(item.productId); // stock changed
  return order;
}


export async function listMine(userId) {
  return prisma.order.findMany({
    where: { customerId: userId },
    include: { items: { include: { product: { select: { title: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMine(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: userId },
    include: {
      items: {
        include: {
          product: { select: { title: true } },
          vendor: { select: { storeName: true } },
        },
      },
    },
  });
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

export async function listForVendor(vendorId) {
  return prisma.orderItem.findMany({
    where: { vendorId, order: { paymentStatus: 'PAID' } },
    include: {
      product: { select: { title: true } },
      order: { select: { address: true, createdAt: true } },
    },
    orderBy: { id: 'desc' },
  });
}
// what a vendor may do next, from each status
const NEXT = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateItemStatus(itemId, vendorId, newStatus) {
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, vendorId, order: { paymentStatus: 'PAID' } },
  });
  if (!item) throw new AppError('Order item not found', 404);

  if (!NEXT[item.status].includes(newStatus)) {
    throw new AppError(`Cannot move from ${item.status} to ${newStatus}`, 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // cancelled items go back on the shelf
    if (newStatus === 'CANCELLED') {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    return tx.orderItem.update({ where: { id: itemId }, data: { status: newStatus } });
  });

  if (newStatus === 'CANCELLED') await syncProduct(item.productId);
  return updated;
}