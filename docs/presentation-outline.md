# 10-minute presentation outline

Required by the brief: **problem, design, challenges, results, next steps.** 10 slides, about 1 minute each. Speak in your own words. These notes are prompts, not a script. Practise out loud twice with a timer.

## Slide 1: Title (0:30)
- Project name, your name, Nexvia Tech internship.
- One line: "A marketplace where many vendors sell, customers buy, and the platform splits each payment and earns a commission."

## Slide 2: The problem (1:00)
- Small sellers need one place to reach buyers. Buyers want one cart across many sellers.
- The hard part is not showing products. It is money: one payment must be split correctly between vendors and the platform, stock must stay correct, and each vendor ships on their own.
- Three roles: customer, vendor, admin.

## Slide 3: Live demo or video (2:30)
Show the full story in this order (practise it, keep it under 2.5 minutes):
1. Vendor applies, admin approves.
2. Vendor adds a product with an image.
3. Customer searches with a typo (`mouce`), adds to cart, applies a coupon, pays in the Razorpay popup.
4. Vendor sees the paid order and marks it packed, shipped, delivered.
5. Customer downloads the invoice and writes a review.
6. Admin analytics page shows commission and revenue.

Have the recorded video ready as a backup in case the internet fails.

## Slide 4: Architecture (1:00)
- Show the system diagram from `docs/architecture.md`.
- Say what each store is for: PostgreSQL is the truth, Redis is the cart and cache, Elasticsearch is search, S3 is images, Razorpay is payments.
- "Everything except PostgreSQL can be rebuilt or is temporary."

## Slide 5: Data design (0:45)
- Show the schema diagram.
- Three decisions: money in paise, status on the order item (vendors ship separately), commission saved as a snapshot at checkout.

## Slide 6: How money flows (1:00)
- Show the payment sequence diagram.
- Example: customer pays Rs. 2,397 for 3 mice, platform keeps 10% (Rs. 239.70), vendor gets Rs. 2,157.30.
- Amount is decided by the server. Signature is verified. Paying twice is safe (idempotent).

## Slide 7: Challenges and how I solved them (1:15)
Pick 3 that are truly yours and explain what you did:
- **Overselling:** two buyers, one item. Fixed with a conditional stock update inside a transaction. Proven with a test.
- **Keeping search in sync:** a test caught that deleted products stayed visible for a second. Cause was a missing index refresh.
- **Unpaid orders:** the vendor was seeing orders that were not paid yet. Fixed by showing only PAID orders and returning stock on cancel.
- Also possible: Express 5 route changes, Razorpay test card rejected, image storage when Docker image was unavailable (storage switch).

## Slide 8: Results (1:00)
- 36 automated tests passing, 72% statement coverage, 82.6% branch coverage.
- Load test on one laptop: search 4,578 to 5,147 requests per second, cart 2,608, p99 under 30 ms.
- Be honest: Redis cache gave about 12% here, because everything runs on one machine.

## Slide 9: Next steps (0:45)
- Auto-cancel unpaid orders after 30 minutes.
- Refund flow and real split settlement with Razorpay Route.
- Cache product detail (slowest read). Hide products of suspended vendors from search.
- HttpOnly cookie instead of localStorage for the token.

## Slide 10: What I learned and thank you (0:15)
- One sentence of real learning, then questions.

## Questions you should be ready for

| Question | Short answer |
|---|---|
| Why Elasticsearch, not SQL `LIKE`? | Relevance ranking, typo tolerance, speed on large catalogs. |
| What if Elasticsearch is down? | Product saves still work, only search stops. `npm run reindex` repairs it. |
| Why is the cart in Redis? | Temporary, read and written often, expiry cleans old carts. Prices are read from the database so they cannot go stale. |
| How do you stop overselling? | `updateMany` with `stock >= quantity` inside a transaction. |
| How do you know a payment is real? | Recompute the HMAC signature with the secret key and compare in constant time. |
| What if the verify call and webhook both arrive? | Only the first changes the order (`updateMany` where status is CREATED), so one payout. |
| Why store commission on each item? | Later commission or price changes must not change past orders. |
| Why is `ADMIN` blocked at register? | Otherwise anyone could make themselves admin. |
| 401 vs 403? | 401 is not logged in. 403 is logged in but not allowed. |
| Why soft delete products? | Old orders still point to them. |
| How are vendors kept from editing others' products? | Every query filters by the vendor's own id, so it returns 404. |
| What would you do with more time? | Pick from the next steps slide. |

## Before you present

- [ ] Backup video works without internet
- [ ] Test data is clean and looks good (real titles, images)
- [ ] Browser tabs open: customer, vendor and admin logged in (use separate profiles or private windows)
- [ ] Razorpay test card ready
- [ ] Timed practice under 10 minutes