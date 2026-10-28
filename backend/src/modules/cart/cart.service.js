import redis from '../../config/redis.js';
import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';

const key = (userId) => `cart:${userId}`;
const CART_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function getCart(userId) {
  const raw = await redis.hgetall(key(userId));
  const ids = Object.keys(raw).map(Number);
  if (!ids.length) return { items: [], subtotalPaise: 0 };

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: {
      images: { take: 1 },
      vendor: { select: { storeName: true, commissionPercent: true } },
    },
  });

  // products deleted since being added are dropped from the cart
  const foundIds = new Set(products.map((p) => p.id));
  const gone = ids.filter((id) => !foundIds.has(id));
  if (gone.length) await redis.hdel(key(userId), ...gone.map(String));

  const items = products.map((p) => {
    const quantity = Number(raw[p.id]);
    return {
      productId: p.id,
      title: p.title,
      imageUrl: p.images[0]?.url ?? null,
      vendorId: p.vendorId,
      storeName: p.vendor.storeName,
      commissionPercent: p.vendor.commissionPercent,
      unitPricePaise: p.pricePaise,
      stock: p.stock,
      quantity,
      linePaise: p.pricePaise * quantity,
    };
  });

  const subtotalPaise = items.reduce((sum, i) => sum + i.linePaise, 0);
  return { items, subtotalPaise };
}

async function checkProduct(productId, wantedQty) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
  });
  if (!product) throw new AppError('Product not found', 404);
  if (wantedQty > product.stock) {
    throw new AppError(`Only ${product.stock} in stock`, 409);
  }
}

export async function addItem(userId, productId, quantity) {
  const current = Number(await redis.hget(key(userId), String(productId))) || 0;
  await checkProduct(productId, current + quantity);

  await redis.hincrby(key(userId), String(productId), quantity);
  await redis.expire(key(userId), CART_TTL_SECONDS);
  return getCart(userId);
}

export async function setQuantity(userId, productId, quantity) {
  const exists = await redis.hexists(key(userId), String(productId));
  if (!exists) throw new AppError('Item is not in your cart', 404);
  await checkProduct(productId, quantity);

  await redis.hset(key(userId), String(productId), quantity);
  return getCart(userId);
}

export async function removeItem(userId, productId) {
  await redis.hdel(key(userId), String(productId));
  return getCart(userId);
}

export async function clear(userId) {
  await redis.del(key(userId));
}