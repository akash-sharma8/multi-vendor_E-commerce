import { z } from 'zod';
import * as searchService from './search.service.js';

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export async function run(req, res) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid search parameters' });
  }
  res.json(await searchService.search(parsed.data));
}