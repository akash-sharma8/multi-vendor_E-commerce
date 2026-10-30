# Architecture

The diagrams below use Mermaid, which GitHub renders automatically. For slides, open this file on GitHub (or paste a block into https://mermaid.live) and export a PNG.

## 1. System architecture

```mermaid
flowchart LR
  User["Customer / Vendor / Admin<br/>(browser)"] --> FE["React app<br/>(Vercel)"]
  FE -->|"HTTPS + JWT"| API["Express API<br/>(Render)"]

  API --> PG[("PostgreSQL<br/>source of truth<br/>(Neon)")]
  API --> RD[("Redis<br/>cart + search cache<br/>(Upstash)")]
  API --> ES[("Elasticsearch<br/>product search<br/>(Elastic Cloud)")]
  API --> S3[("S3 storage<br/>product images")]
  API <-->|"create order, verify signature"| RZP["Razorpay"]

  RZP -.->|"webhook: payment.captured"| API
  FE -->|"payment popup"| RZP
```

**How the pieces work together**

- PostgreSQL holds all real data. Everything else can be rebuilt or is temporary.
- Elasticsearch holds a searchable copy of each product, updated after every product change.
- Redis holds each customer's cart (key `cart:<userId>`, 7 day expiry) and cached search results (30 seconds).
- Images go to S3 storage. Only the URL is saved in PostgreSQL.
- Razorpay handles card details, so they never touch our server.

## 2. Backend layers

```mermaid
flowchart TD
  R["Routes<br/>(URL + middleware)"] --> C["Controller<br/>(validation, HTTP response)"]
  C --> S["Service<br/>(business rules)"]
  S --> P["Prisma / Redis / Elasticsearch / S3"]

  M1["requireAuth (JWT)"] -.-> R
  M2["requireRole"] -.-> R
  M3["vendorApproved"] -.-> R
  M4["zod validate"] -.-> R
  E["errorHandler"] -.-> C
```

## 3. Database schema

All prices are integers in paise (100 paise = 1 rupee).

```mermaid
erDiagram
  USER ||--o| VENDOR_PROFILE : "has, if vendor"
  USER ||--o{ ORDER : places
  USER ||--o{ REVIEW : writes
  VENDOR_PROFILE ||--o{ PRODUCT : sells
  VENDOR_PROFILE ||--o{ ORDER_ITEM : fulfils
  VENDOR_PROFILE ||--o{ PAYOUT : receives
  CATEGORY ||--o{ PRODUCT : groups
  PRODUCT ||--o{ PRODUCT_IMAGE : has
  PRODUCT ||--o{ REVIEW : receives
  PRODUCT ||--o{ ORDER_ITEM : "bought as"
  COUPON |o--o{ ORDER : "applied to"
  ORDER ||--|{ ORDER_ITEM : contains
  ORDER ||--o| PAYMENT : "paid by"

  USER {
    int id PK
    string email UK
    string passwordHash
    enum role "CUSTOMER VENDOR ADMIN"
  }
  VENDOR_PROFILE {
    int id PK
    int userId UK
    string storeName
    enum status "PENDING APPROVED REJECTED SUSPENDED"
    int commissionPercent
  }
  PRODUCT {
    int id PK
    int vendorId FK
    int categoryId FK
    string title
    int pricePaise
    int stock
    bool isActive "false means soft deleted"
  }
  ORDER {
    int id PK
    int customerId FK
    int couponId FK
    int subtotalPaise
    int discountPaise
    int totalPaise
    enum paymentStatus "CREATED PAID FAILED REFUNDED"
    string address
  }
  ORDER_ITEM {
    int id PK
    int orderId FK
    int productId FK
    int vendorId FK
    int quantity
    int unitPricePaise "price snapshot"
    int commissionPaise "snapshot"
    int vendorEarnPaise "snapshot"
    enum status "PLACED PACKED SHIPPED DELIVERED CANCELLED"
  }
  PAYMENT {
    int id PK
    int orderId UK
    string razorpayOrderId UK
    string razorpayPaymentId
    enum status
  }
  PAYOUT {
    int id PK
    int vendorId FK
    int amountPaise
  }
  COUPON {
    int id PK
    string code UK
    int discountPercent
    int maxUses
    int usedCount
    datetime expiresAt
  }
  REVIEW {
    int id PK
    int userId FK
    int productId FK
    int rating
  }
```

`REVIEW` has a unique key on (userId, productId), so one review per customer per product.

## 4. Checkout and payment flow

```mermaid
sequenceDiagram
  actor C as Customer
  participant FE as React app
  participant API as Express API
  participant DB as PostgreSQL
  participant RD as Redis
  participant RZ as Razorpay

  C->>FE: Click Pay
  FE->>API: POST /orders/checkout (address, coupon)
  API->>RD: read cart (ids + quantities)
  API->>DB: read current prices
  API->>DB: transaction: reduce stock, claim coupon, create order and items
  API->>RD: clear cart
  API-->>FE: order (payment status CREATED)

  FE->>API: POST /payments/create
  API->>RZ: create Razorpay order (amount from DB)
  API-->>FE: razorpayOrderId, keyId
  FE->>RZ: open payment popup
  C->>RZ: pay
  RZ-->>FE: payment id + signature
  FE->>API: POST /payments/verify
  API->>API: recompute HMAC-SHA256, compare
  API->>DB: mark order PAID (once), create vendor payouts
  API-->>FE: PAID

  RZ-->>API: webhook payment.captured (backup path)
  Note over API,DB: Second call changes nothing, so no double payout
```

If the customer closes the popup, the order stays unpaid. They can use **Pay now** or **Cancel order** later. Cancelling puts the stock back and returns the coupon use.

## 5. Order item status flow

```mermaid
stateDiagram-v2
  [*] --> PLACED: checkout
  PLACED --> PACKED: vendor
  PLACED --> CANCELLED: vendor (stock returned)
  PACKED --> SHIPPED: vendor
  SHIPPED --> DELIVERED: vendor
  DELIVERED --> [*]
  CANCELLED --> [*]
```

Vendors only see an order after payment is PAID. Skipping a step (for example PLACED to DELIVERED) is rejected with 400. A customer can review a product only after the item is DELIVERED.

## 6. Search sync

```mermaid
flowchart LR
  V["Vendor creates, edits,<br/>deletes or uploads image"] --> DB[("PostgreSQL")]
  DB --> SYNC["syncProduct(id)"]
  SYNC -->|"index or delete"| ES[("Elasticsearch")]
  ORD["Checkout / cancel<br/>(stock changes)"] --> SYNC
  RE["npm run reindex"] -->|"rebuild everything"| ES
  Q["GET /api/search"] --> CACHE{"Redis cache hit?"}
  CACHE -->|yes| OUT["response"]
  CACHE -->|no| ES
  ES --> OUT
```

If the sync fails it is only logged, so a search problem never blocks the vendor. The reindex script repairs any difference.

## 7. Security measures

| Measure | Where |
|---|---|
| Passwords hashed with bcrypt | auth service |
| JWT with role, checked on every protected route | `requireAuth`, `requireRole` |
| Admin cannot be created through public registration | register schema |
| Vendor can only change own products | `vendorId` filter in product service |
| Request bodies validated | zod schemas |
| Payment amount calculated on the server | payment service |
| Payment signature verified with constant-time compare | payment service |
| Image type and size limits, random file names | upload middleware |
| Security headers | helmet |
| Secrets only in `.env`, never committed | `.gitignore` |