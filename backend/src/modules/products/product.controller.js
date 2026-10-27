import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import * as productService from './product.service.js';

export const productSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10),
  pricePaise: z.number().int().positive(),
  stock: z.number().int().min(0),
  categoryId: z.number().int().optional(),
});

export const updateSchema = productSchema.partial();

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid id', 400);
  return id;
}

export async function create(req, res) {
  const product = await productService.create(req.vendor.id, req.body);
  res.status(201).json(product);
}

export async function listMine(req, res) {
  res.json(await productService.listMine(req.vendor.id));
}

export async function getOne(req, res) {
  res.json(await productService.getPublic(parseId(req.params.id)));
}

export async function update(req, res) {
  const product = await productService.update(parseId(req.params.id), req.vendor.id, req.body);
  res.json(product);
}

export async function remove(req, res) {
  await productService.remove(parseId(req.params.id), req.vendor.id);
  res.status(204).end();
}

export async function addImages(req, res) {
  const images = await productService.addImages(parseId(req.params.id), req.vendor.id, req.files);
  res.status(201).json(images);
}