import { z } from 'zod';
import * as vendorService from './vendor.service.js';

export const applySchema = z.object({
  storeName: z.string().min(3).max(60),
  description: z.string().max(500).optional(),
});

export async function apply(req, res) {
  const vendor = await vendorService.apply(req.user.id, req.body);
  res.status(201).json(vendor);
}

export async function mine(req, res) {
  res.json(await vendorService.getMine(req.user.id));
}