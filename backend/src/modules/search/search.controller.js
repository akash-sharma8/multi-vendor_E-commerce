import { z } from 'zod';
import redis from '../../config/redis.js';
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

const CACHE_SECONDS = 30;
// off while testing (tests must see fresh data) or when SEARCH_CACHE=off (for benchmarks)
const cacheEnabled = () =>
  process.env.SEARCH_CACHE !== 'off' && process.env.NODE_ENV !== 'test';

export async function run(req, res) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid search parameters' });
  }

  const key = `search:${JSON.stringify(parsed.data)}`;

  if (cacheEnabled()) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        res.set('X-Cache', 'HIT');
        return res.type('json').send(hit);
      }
    } catch (err) {
      console.error('search cache read failed:', err.message); // cache trouble must not break search
    }
  }

  const result = await searchService.search(parsed.data);

  if (cacheEnabled()) {
    redis.set(key, JSON.stringify(result), 'EX', CACHE_SECONDS).catch(() => {});
  }
  res.set('X-Cache', 'MISS');
  res.json(result);
}