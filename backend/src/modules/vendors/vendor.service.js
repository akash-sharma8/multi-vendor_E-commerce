import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';

export async function apply(userId, { storeName, description }) {
  const existing = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (existing) throw new AppError('You already applied', 409);

  return prisma.vendorProfile.create({
    data: { userId, storeName, description },
  });
}

export async function getMine(userId) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('No vendor profile yet', 404);
  return vendor;
}