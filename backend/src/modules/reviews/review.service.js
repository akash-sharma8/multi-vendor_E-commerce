import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';

export async function create(userId, productId, { rating, comment }) {
  const received = await prisma.orderItem.findFirst({
    where: {
      productId,
      status: 'DELIVERED',
      order: { customerId: userId, paymentStatus: 'PAID' },
    },
  });
  if (!received) {
    throw new AppError('You can review only products you have received', 403);
  }

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) throw new AppError('You already reviewed this product', 409);

  return prisma.review.create({ data: { userId, productId, rating, comment } });
}

export async function list(productId) {
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product) throw new AppError('Product not found', 404);

  const [reviews, stats] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  return {
    average: stats._avg.rating === null ? null : Number(stats._avg.rating.toFixed(1)),
    count: stats._count,
    reviews,
  };
}