import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import * as adminService from './admin.service.js';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export const vendorUpdateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    commissionPercent: z.number().int().min(0).max(50).optional(),
  })
  .refine((d) => d.status !== undefined || d.commissionPercent !== undefined, {
    message: 'send status or commissionPercent',
  });

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid id', 400);
  return id;
}

export async function listVendors(req, res) {
  const parsed = z.enum(STATUSES).optional().safeParse(req.query.status);
  if (!parsed.success) throw new AppError('Invalid status', 400);
  res.json(await adminService.listVendors(parsed.data));
}

export async function updateVendor(req, res) {
  res.json(await adminService.updateVendor(parseId(req.params.id), req.body));
}