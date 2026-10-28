import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';

export async function listVendors(status) {
  return prisma.vendorProfile.findMany({
    where: status ? { status } : {},
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateVendor(id, { status, commissionPercent }) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id } });
  if (!vendor) throw new AppError('Vendor not found', 404);

  return prisma.vendorProfile.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(commissionPercent !== undefined && { commissionPercent }),
    },
  });
}