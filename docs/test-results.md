## Performance (autocannon, 20 connections, 15 s, local machine)

| Endpoint | Req/sec | Avg latency | p99 latency | Errors |
|---|---|---|---|---|
| GET /api/health (baseline) | 7,575 | 2.14 ms | 16 ms | 0 |
| GET /api/products/1 (Postgres) | 1,143 | 16.99 ms | 32 ms | 0 |
| GET /api/search?q=mouse, no cache (Elasticsearch) | 4,578 | 3.88 ms | 12 ms | 0 |
| GET /api/search?q=mouse, Redis cache | 5,147 | 3.39 ms | 11 ms | 0 |
| GET /api/cart (Redis cart + Postgres prices) | 2,608 | 7.19 ms | 28 ms | 0 |

Observation: on one machine the Redis search cache gave about 12% more throughput.
Elasticsearch is already fast on a small catalog with no network hop, so the benefit
should grow in production (separate servers, larger catalog). The product detail
endpoint (Postgres with 3 joins) is the slowest read and is a candidate for caching.

Coverage: 72.15% statements, 82.6% branches, 57.28% functions.
36 tests in 5 suites, all passing, about 12 s.