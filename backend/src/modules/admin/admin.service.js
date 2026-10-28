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

export async function analytics() {
  const paidItems = { order: { paymentStatus: 'PAID' }, status: { not: 'CANCELLED' } };

  const [orders, items, usersByRole, vendorsByStatus, topProductRows, topVendorRows, daily] =
    await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _count: true,
        _sum: { totalPaise: true, discountPaise: true },
      }),
      prisma.orderItem.aggregate({
        where: paidItems,
        _sum: { commissionPaise: true, vendorEarnPaise: true },
      }),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.vendorProfile.groupBy({ by: ['status'], _count: true }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: paidItems,
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.orderItem.groupBy({
        by: ['vendorId'],
        where: paidItems,
        _sum: { vendorEarnPaise: true, commissionPaise: true },
        orderBy: { _sum: { vendorEarnPaise: 'desc' } },
        take: 5,
      }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") AS day,
               COUNT(*)::int AS orders,
               COALESCE(SUM("totalPaise"), 0)::int AS "revenuePaise"
        FROM "Order"
        WHERE "paymentStatus" = 'PAID' AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day`,
    ]);

  const [products, vendors] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: topProductRows.map((r) => r.productId) } },
      select: { id: true, title: true },
    }),
    prisma.vendorProfile.findMany({
      where: { id: { in: topVendorRows.map((r) => r.vendorId) } },
      select: { id: true, storeName: true },
    }),
  ]);
  const titleOf = new Map(products.map((p) => [p.id, p.title]));
  const storeOf = new Map(vendors.map((v) => [v.id, v.storeName]));

  const commissionPaise = items._sum.commissionPaise ?? 0;
  const discountPaise = orders._sum.discountPaise ?? 0;

  return {
    paidOrders: orders._count,
    revenuePaise: orders._sum.totalPaise ?? 0, // what customers paid
    commissionPaise, // gross platform commission
    discountPaise, // coupons paid by platform
    platformNetPaise: commissionPaise - discountPaise,
    vendorEarningsPaise: items._sum.vendorEarnPaise ?? 0,
    users: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
    vendors: Object.fromEntries(vendorsByStatus.map((r) => [r.status, r._count])),
    topProducts: topProductRows.map((r) => ({
      productId: r.productId,
      title: titleOf.get(r.productId),
      unitsSold: r._sum.quantity,
    })),
    topVendors: topVendorRows.map((r) => ({
      vendorId: r.vendorId,
      storeName: storeOf.get(r.vendorId),
      earnedPaise: r._sum.vendorEarnPaise,
      commissionPaise: r._sum.commissionPaise,
    })),
    daily: daily.map((d) => ({
      day: d.day.toISOString().slice(0, 10),
      orders: d.orders,
      revenuePaise: d.revenuePaise,
    })),
  };
}