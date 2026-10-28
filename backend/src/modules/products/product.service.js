import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import uploadToS3 from '../../utils/uploadToS3.js';
import { syncProduct } from '../search/search.service.js';

export async function create(vendorId, data) {
  const product = await prisma.product.create({
    data: { ...data, vendorId },
    include: { images: true },
  });
  await syncProduct(product.id);
  return product;
}

export async function listMine(vendorId) {
  return prisma.product.findMany({
    where: { vendorId },
    include: { images: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPublic(id) {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      images: true,
      category: true,
      vendor: { select: { storeName: true } },
    },
  });
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

async function findOwned(id, vendorId) {
  const product = await prisma.product.findFirst({ where: { id, vendorId } });
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

export async function update(id, vendorId, data) {
  await findOwned(id, vendorId);
  const product = await prisma.product.update({
    where: { id },
    data,
    include: { images: true },
  });
  await syncProduct(id);
  return product;
}

// soft delete: old orders still point at this product
export async function remove(id, vendorId) {
  await findOwned(id, vendorId);
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  await syncProduct(id); // removes it from the search index
}

export async function addImages(id, vendorId, files) {
  await findOwned(id, vendorId);
  if (!files?.length) throw new AppError('No images uploaded', 400);

  const urls = await Promise.all(files.map((f) => uploadToS3(f)));
  await prisma.productImage.createMany({
    data: urls.map((url) => ({ productId: id, url })),
  });
  await syncProduct(id);
  return prisma.productImage.findMany({ where: { productId: id } });
}