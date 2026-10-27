import prisma from '../config/db.js';
import AppError from '../utils/AppError.js';

export default async function vendorApproved(req, res, next) {
  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!vendor) throw new AppError('Apply as a vendor first', 403);
    if (vendor.status !== 'APPROVED') {
      throw new AppError(`Your vendor account is ${vendor.status}`, 403);
    }
    req.vendor = vendor;
    next();
  } catch (err) {
    next(err);
  }
}