import { z } from 'zod';
import * as couponService from './coupon.service.js';

export const createSchema = z.object({
  code: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9]+$/, 'letters and digits only'),
  discountPercent: z.number().int().min(1).max(90),
  maxUses: z.number().int().min(1).default(100),
  expiresAt: z.coerce.date().optional(),
});

export const previewSchema = z.object({
  code: z.string().trim().min(1).max(20),
});

export async function create(req, res) {
  res.status(201).json(await couponService.create(req.body));
}

export async function list(req, res) {
  res.json(await couponService.list());
}

export async function preview(req, res) {
  res.json(await couponService.preview(req.user.id, req.body.code));
}