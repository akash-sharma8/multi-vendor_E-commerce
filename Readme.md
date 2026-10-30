# Multi-Vendor E-Commerce Marketplace

An Amazon-style marketplace where many vendors sell, customers buy, and the platform splits every payment and earns a commission.

Built as the capstone project for the Nexvia Tech internship (Full-Stack track).

- **Live demo:** _add link after deployment_
- **Demo video:** _add link_
- **Backend API:** _add link after deployment_

## What it does

| Role | Can do |
|---|---|
| **Customer** | Search and filter products, add to cart, apply coupons, pay with Razorpay, track orders, download PDF invoices, review delivered products |
| **Vendor** | Apply for a store, add and edit products, upload images, see paid orders, move items through PACKED, SHIPPED, DELIVERED, see earnings and commission |
| **Admin** | Approve, reject or suspend vendors, set commission per vendor, create coupons, view analytics (revenue, commission, top products, daily sales) |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Recharts |
| Backend | Node.js, Express 5 (ES modules), zod validation |
| Database | PostgreSQL 16 with Prisma 6 |
| Search | Elasticsearch 8.13 (fuzzy search, filters, sorting, pagination) |
| Cache and cart | Redis 7 (cart storage, search result cache) |
| Image storage | S3-compatible storage (local disk in development) |
| Payments | Razorpay (test mode) |
| PDF invoices | PDFKit |
| Tests | Jest, Supertest, autocannon |
| Local infrastructure | Docker Compose |

## Architecture in one minute

```
React app  ->  Express API  ->  PostgreSQL     (source of truth)
                           ->  Redis           (cart, search cache)
                           ->  Elasticsearch   (searchable copy of products)
                           ->  S3 storage      (product images)
                           ->  Razorpay        (payments, signature verified)
```

Full diagrams (architecture, database schema, payment flow, order status flow) are in [docs/architecture.md](docs/architecture.md).

## Key design decisions

1. **Money is stored as integer paise.** No floating point rounding bugs.
2. **Prices come from the database, never from the client.** The cart stores only product ids and quantities, and the payment amount is calculated on the server.
3. **Order status lives on each order item**, because two vendors in one order ship independently.
4. **Commission is a snapshot.** It is calculated at checkout and stored per item, so later changes to commission or price do not rewrite history.
5. **No overselling.** Stock is reduced with a conditional update inside a transaction, so two buyers of the last item cannot both succeed.
6. **Payments are verified on the server** with an HMAC-SHA256 signature. Verification is idempotent, so a payment is never counted twice (browser callback plus webhook).
7. **PostgreSQL is the source of truth.** Elasticsearch is a copy that can be rebuilt any time with `npm run reindex`. A search outage never blocks a vendor from saving a product.
8. **Storage is switchable.** `STORAGE=local` for development, `STORAGE=s3` for production.

## Project structure

```
marketplace/
├── backend/
│   ├── prisma/                 schema, migrations, seed
│   ├── scripts/                reindex.js, setup-test-users.js
│   ├── src/
│   │   ├── config/             db, redis, elastic, s3, razorpay clients
│   │   ├── middleware/         auth, role, vendorApproved, upload, validate, errorHandler
│   │   ├── modules/            auth, vendors, products, search, cart, orders,
│   │   │                       payments, reviews, coupons, invoices, admin
│   │   ├── utils/              AppError, asyncHandler, uploadToS3
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/                  integration tests
│   ├── docker-compose.yml      postgres, redis, elasticsearch
│   └── .env.example
├── frontend/
│   └── src/                    api, context, components, pages
├── docs/                       api.md, architecture.md, test-results.md, pay-test.html
└── README.md
```

Each backend module has `routes`, `controller` and `service` files. Routes wire middleware, controllers handle HTTP, services hold the business logic.

## Getting started (local setup)

### Prerequisites

- Node.js 20 or newer
- Docker Desktop
- Git
- A Razorpay account in **test mode** (for API keys)

### 1. Clone and start the services

```bash
git clone <your-repo-url>
cd marketplace/backend
docker compose up -d
```

This starts PostgreSQL (5432), Redis (6379) and Elasticsearch (9200). Elasticsearch takes about 30 seconds to be ready. Check with `http://localhost:9200`.

### 2. Configure the backend

```bash
cp .env.example .env
```

Open `.env` and fill in:

- `JWT_SECRET`: any long random string
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: Razorpay dashboard, Test Mode, Account and Settings, API Keys

The other defaults already match the Docker setup.

### 3. Install, migrate, seed, index

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run reindex
```

The seed creates the admin account and 5 categories.

### 4. Run the backend

```bash
npm run dev
```

The API runs on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 5. Run the frontend

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

### Default accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@market.com` | `Admin@12345` (change this in any real deployment) |
| Customer and vendor | Register from the UI. Vendors must be approved by the admin before they can add products. | |

Helper script that creates a test vendor, a test customer and a product, and prints their tokens:

```bash
node scripts/setup-test-users.js
```

### Paying with Razorpay in test mode

Use a test card in the Razorpay popup, for example Mastercard `5267 3181 8797 5449`, any future expiry, any CVV. On the bank page choose **Success**. If a card is rejected, use Netbanking. Never use live keys.

## Tests

Tests run against the real Postgres, Redis and Elasticsearch (not mocks), so Docker must be running.

```bash
npm test                # 36 tests
npm run test:coverage   # with coverage report
```

Results and load test numbers are in [docs/test-results.md](docs/test-results.md).

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Backend with auto reload |
| `npm start` | Backend in production mode |
| `npm test` | Run all tests |
| `npm run reindex` | Rebuild the Elasticsearch index from PostgreSQL |
| `npx prisma studio` | Browse the database in the browser |

## API documentation

All endpoints, roles and example requests: [docs/api.md](docs/api.md).

## Deployment

| Part | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| PostgreSQL | Neon |
| Redis | Upstash |
| Elasticsearch | Elastic Cloud |
| Images | S3-compatible storage (Supabase Storage) |

_Add the deployment steps and live links here once deployed._

Production notes: set `STORAGE=s3` and the `S3_*` values, restrict CORS to the frontend URL, use real secrets, register the Razorpay webhook (`payment.captured`) at `/api/payments/webhook`, and change the admin password.

## Known limitations and next steps

- Unpaid orders hold stock until the customer cancels (a scheduled job should auto-cancel after about 30 minutes).
- No refund flow for a paid item that a vendor cancels (Razorpay refund API and payout reversal).
- Vendor payouts are recorded in a `Payout` table, not transferred. Razorpay Route would automate real split settlement.
- Products of a suspended vendor stay in search results.
- No per-user limit on coupon use.
- Search cache can be up to 30 seconds stale. Product detail (3 joins) is the slowest read and could be cached.
- The login token is kept in localStorage. An httpOnly cookie would be safer.
- amit@test.com / Test@1234
- admin@market.com / Admin@12345
- ravi@test.com    Test@1234