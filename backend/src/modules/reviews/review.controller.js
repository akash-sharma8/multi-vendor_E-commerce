import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import * as reviewService from './review.service.js';

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid id', 400);
  return id;
}

export async function create(req, res) {
  const review = await reviewService.create(req.user.id, parseId(req.params.id), req.body);
  res.status(201).json(review);
}

export async function list(req, res) {
  res.json(await reviewService.list(parseId(req.params.id)));
}