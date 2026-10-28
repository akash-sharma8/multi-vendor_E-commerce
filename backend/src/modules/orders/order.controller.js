import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import * as orderService from './order.service.js';

export const checkoutSchema = z.object({
  address: z.string().trim().min(10, 'please enter a full address').max(300),
  couponCode: z.string().trim().min(1).max(20).optional(),
});

export const statusSchema = z.object({
  status: z.enum(['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid id', 400);
  return id;
}

export async function checkout(req, res) {
  res.status(201).json(await orderService.checkout(req.user.id, req.body));
}

export async function listMine(req, res) {
  res.json(await orderService.listMine(req.user.id));
}

export async function getOne(req, res) {
  res.json(await orderService.getMine(req.user.id, parseId(req.params.id)));
}

export async function vendorItems(req, res) {
  res.json(await orderService.listForVendor(req.vendor.id));
}

export async function updateStatus(req, res) {
  const item = await orderService.updateItemStatus(
    parseId(req.params.id),
    req.vendor.id,
    req.body.status
  );
  res.json(item);
}