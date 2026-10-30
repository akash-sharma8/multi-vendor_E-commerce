# Test results

Date: 29 Oct 2026
Environment: Windows laptop, Node 24, PostgreSQL 16, Redis 7, Elasticsearch 8.13 (all in Docker, on the same machine).

## 1. Automated tests

Command: `npm test`

```
Test Suites: 5 passed, 5 total
Tests:       36 passed, 36 total
Time:        about 6 to 12 s
```

| Suite | What it proves |
|---|---|
| `auth.test.js` | Register works, password hash is never returned, wrong password gives 401, `/me` needs a token |
| `cart-order.test.js` | Subtotal comes from database price, quantity above stock is rejected, vendors cannot use the cart, commission math is exact (10% of 200000 paise = 20000), stock goes down and cart empties after checkout, empty cart cannot checkout, unpaid orders are hidden from vendors, **two customers buying the last item at the same time: one succeeds, one gets 409, stock never goes below 0** |
| `payment.test.js` | Wrong signature rejected (order stays unpaid), another customer cannot verify someone else's payment, valid signature marks PAID and creates exactly one payout of the right amount, **verifying twice does not create a second payout**, paid orders cannot be cancelled, status steps cannot be skipped, another vendor cannot touch the item, review blocked before delivery, one review allowed after delivery (duplicate and invalid rating rejected), cancelling an unpaid order returns stock |
| `coupon.test.js` | Only admins create coupons, duplicate code rejected, preview does not use the coupon, discount applied at checkout while vendor earnings stay unchanged, max uses enforced, cancelling returns the coupon use |
| `search.test.js` | New product appears in search, price filter works, price update is reflected, invalid sort rejected, deleted product leaves search immediately |

Tests use the real database, Redis and Elasticsearch (no mocks). Each test file creates uniquely tagged data and deletes it at the end, so real data is never touched.

The Razorpay popup cannot run in a test, so the tests build the same HMAC-SHA256 signature Razorpay would send. This tests our own verification code.

### A real bug found by the tests

The first run of the suite had 1 failure: a deleted product was still returned by search for about a second. Cause: the Elasticsearch delete call did not request an index refresh (create and update did). Fix: `refresh: true` on delete. After the fix all 36 tests pass.

## 2. Coverage

Command: `npm run test:coverage`

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 72.15% | 82.6% | 57.28% | 72.15% |

The least covered files are the PDF invoice, admin analytics, the product image upload, the webhook handler and the Razorpay order creation, because those need a browser, a real file or real Razorpay. They were checked by hand.

## 3. Performance

Tool: autocannon. 20 concurrent connections, 15 seconds per run, production mode (`npm start`), everything on one laptop.

| Endpoint | Req/sec | Avg latency | p99 latency | Errors |
|---|---|---|---|---|
| `GET /api/health` (baseline) | 7,575 | 2.14 ms | 16 ms | 0 |
| `GET /api/products/1` (PostgreSQL, 3 joins) | 1,143 | 16.99 ms | 32 ms | 0 |
| `GET /api/search?q=mouse`, Redis cache off (Elasticsearch) | 4,578 | 3.88 ms | 12 ms | 0 |
| `GET /api/search?q=mouse`, Redis cache on | 5,147 | 3.39 ms | 11 ms | 0 |
| `GET /api/cart` (Redis cart plus PostgreSQL prices) | 2,608 | 7.19 ms | 28 ms | 0 |

### What the numbers say

- The Redis search cache gave about **12% more throughput** (5,147 vs 4,578 requests per second). The gain is small here because Elasticsearch is already fast on a small catalog and there is no network hop between services on one machine. It should grow with a larger catalog and separate servers.
- The product detail endpoint is the slowest read. It fetches images, category and vendor with joins. Caching it, or using a lighter query, is a clear next optimisation.
- The cart endpoint reads Redis and then fetches current prices from PostgreSQL on purpose, so a stale cart can never charge an old price.

### Limits of this test

All services share one machine with the load generator, so these are relative numbers, not production capacity. Production numbers will differ.

### How to reproduce

```bash
cd backend
npm start                      # terminal 1
npx autocannon -c 20 -d 15 http://localhost:5000/api/health
npx autocannon -c 20 -d 15 "http://localhost:5000/api/products/1"
npx autocannon -c 20 -d 15 "http://localhost:5000/api/search?q=mouse"
# cache off: stop the server, then (cmd) `set SEARCH_CACHE=off` and `npm start`
# cart: add -H "Authorization=Bearer <customer token>" to /api/cart
```

## 4. Manual checks (done by hand)

- Razorpay test payment through the real popup, order becomes PAID, payout row created.
- PDF invoice download, with and without a coupon.
- Image upload and display (local storage).
- Vendor approval and commission change from the admin page.
- Admin analytics charts.