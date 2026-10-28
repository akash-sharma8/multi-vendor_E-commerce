import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import * as cartService from './cart.service.js';

export const addSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10).default(1),
});

export const quantitySchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid id', 400);
  return id;
}

export async function get(req, res) {
  res.json(await cartService.getCart(req.user.id));
}

export async function add(req, res) {
  const { productId, quantity } = req.body;
  res.status(201).json(await cartService.addItem(req.user.id, productId, quantity));
}

export async function update(req, res) {
  const productId = parseId(req.params.productId);
  res.json(await cartService.setQuantity(req.user.id, productId, req.body.quantity));
}

export async function remove(req, res) {
  res.json(await cartService.removeItem(req.user.id, parseId(req.params.productId)));
}

export async function clear(req, res) {
  await cartService.clear(req.user.id);
  res.status(204).end();
}