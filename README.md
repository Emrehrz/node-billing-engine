# Node Billing Engine

A robust, production-ready backend service for managing user subscriptions and processing payments, built with Node.js, Express, and PostgreSQL.

---

## 1. Project Overview
The Node Billing Engine is a RESTful API designed to handle secure user authentication, resource authorization, and the atomic creation of subscriptions and payment records. It serves as the core billing infrastructure for a SaaS subscription platform.

---

## 2. Architecture Overview
The application follows a clean layered architecture, ensuring separation of concerns, high maintainability, and testability.

```mermaid
flowchart TD
    Client[Client Request] --> Express[Express.js App]
    
    subgraph ExpressApp [Express Application]
        Express --> Middleware[Middlewares: Auth, Error Handler, Logger]
        Middleware --> Controller[Controllers: Auth, Subscription]
        Controller --> Service[Services: Auth, Subscription]
        Service --> Repository[Repositories: User, Plan, Sub, Payment]
    end
    
    subgraph External [External Services]
        Service -.-> PaymentProvider[Payment Provider Interface]
        PaymentProvider --> FakePaymentProvider[Fake Payment Implementation]
    end

    Repository --> PostgreSQL[(PostgreSQL Database)]
```

---

## 3. Spotlight: Complete Request Lifecycle (`POST /subscriptions`)

This project implements one complete request from start to finish as requested for the technical assessment:
**`request → validation → business logic → database read/write → response`**

### Request Trace & Execution Pipeline

| Step | Stage | Exact Code Location | What Happens |
|:---:|---|---|---|
| **1** | **HTTP Entry** | [`src/server.ts`](src/server.ts) & [`src/app.ts`](src/app.ts) | Express server receives `POST /subscriptions`. The `express.json()` middleware parses the raw JSON payload into `req.body`. Invalid JSON triggers a `SyntaxError` which produces a 400 Bad Request. |
| **2** | **Request Tracing & Logging** | [`src/middleware/requestLogger.ts`](src/middleware/requestLogger.ts) | Reads the incoming `x-request-id` header or generates a new `crypto.randomUUID()`. Attaches `req.id` and a child Pino logger (`req.log`). A `res.on('finish')` listener records method, endpoint, status code, and duration upon response completion. |
| **3** | **Authentication** | [`src/middleware/auth.ts`](src/middleware/auth.ts) | Validates `Authorization: Bearer <token>` header using `jwt.verify(token, env.JWT_SECRET)`. Sets `(req as any).user = { id: payload.sub }`. If missing or invalid, throws `AppError('UNAUTHORIZED', 401)`. |
| **4** | **Input Validation** | [`src/middleware/validate.ts`](src/middleware/validate.ts) + [`src/schemas/subscription.schema.ts`](src/schemas/subscription.schema.ts) | Validates payload against `createSubscriptionSchema` using Zod. Ensures `body.planId` is a valid UUID. If validation fails, `ZodError` is caught and converted to HTTP 400 with a structured `VALIDATION_ERROR` code. |
| **5** | **Controller Delegation** | [`src/controllers/subscription.controller.ts`](src/controllers/subscription.controller.ts) | Pure HTTP orchestration (zero business logic). Extracts `userId` from auth context and `planId` from validated body, forwarding them to `subscriptionService.createSubscription(userId, planId)`. Handler is wrapped with `asyncHandler`. |
| **6** | **Service: Plan Lookup** | [`src/services/subscription.service.ts`](src/services/subscription.service.ts) | Queries `PlanRepository.getPlanById(planId)` using a parameterized query (`SELECT * FROM plans WHERE id = $1`). Throws `AppError('PLAN_NOT_FOUND', 404)` if the plan does not exist. |
| **7** | **Service: Duplicate Guard** | [`src/services/subscription.service.ts`](src/services/subscription.service.ts) | Queries `SubscriptionRepository.hasActiveOrPendingSubscription(userId)`. If user already has an active or pending subscription, throws `AppError('SUBSCRIPTION_EXISTS', 409)` before initiating payment. |
| **8** | **Payment Processing** | [`src/services/payment.provider.ts`](src/services/payment.provider.ts) | Calls `FakePaymentProvider.processPayment(plan.price, plan.currency)`. Simulates network latency and external payment gateway response. If payment fails, throws `AppError('PAYMENT_FAILED', 402)`. **No database writes have occurred yet.** |
| **9** | **Database Transaction (BEGIN)** | [`src/services/subscription.service.ts`](src/services/subscription.service.ts) | Acquires a dedicated `PoolClient` from `pool.connect()` and initiates an explicit transaction (`client.query('BEGIN')`). |
| **10** | **Atomic Inserts** | [`src/repositories/subscription.repository.ts`](src/repositories/subscription.repository.ts) & [`src/repositories/payment.repository.ts`](src/repositories/payment.repository.ts) | Using the **same transaction client**: <br>1. Inserts subscription with status `ACTIVE`.<br>2. Inserts payment with snapshotted `amount` (`plan.price`) and `currency` (`plan.currency`), provider reference, and status `SUCCEEDED`. |
| **11** | **Commit / Rollback** | [`src/services/subscription.service.ts`](src/services/subscription.service.ts) | On success, executes `client.query('COMMIT')`. In `catch` block, executes `client.query('ROLLBACK')` (also handles race conditions via DB unique partial index `unique_active_subscription`, converting error code `23505` to 409). The `finally` block guarantees `client.release()`. |
| **12** | **Response Exit Point** | [`src/controllers/subscription.controller.ts`](src/controllers/subscription.controller.ts) | Responds with HTTP 201 Created and JSON payload: `{ subscription, payment }`. |

### Key Domain & Technical Guarantees
- **Atomic Database Operations**: Subscriptions and payments are created within a single transaction. If any step fails after `BEGIN`, both operations roll back completely.
- **Financial Price Snapshotting**: The payment record stores the exact plan price and currency at the moment of purchase (`plan.price`, `plan.currency`), protecting historic financial records from future plan price modifications.
- **Sensitive Data Redaction**: Passwords, hashes (`password_hash`), and auth headers (`Authorization`) are strictly redacted by Pino at the logging configuration layer.
- **Race Condition Defence (TOCTOU)**: Concurrent requests are prevented at two layers: an application-level pre-check query, and a PostgreSQL partial unique index (`unique_active_subscription` on `user_id` WHERE `status IN ('PENDING', 'ACTIVE')`).

---

## 4. Technology Stack
- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Database**: PostgreSQL (using official `pg` driver with connection pooling)
- **Language**: TypeScript
- **Authentication**: JWT (`jsonwebtoken`) & Argon2 (password hashing via `argon2`)
- **Validation**: Zod (runtime request schema validation)
- **Logging**: Pino & Pino-pretty (structured JSON logging with automatic sensitive field redaction)
- **Testing**: Vitest & Supertest (integration testing against live PostgreSQL)

---

## 5. How to Run Locally

### Prerequisites
- Node.js (v18+)
- Docker (for local PostgreSQL instance)

### Setup Instructions
1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```
2. **Start the Database**
   ```bash
   docker run --name pg-billing -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=node_billing -p 5432:5432 -d postgres
   ```
3. **Configure Environment**
   Copy `.env.example` to `.env` and configure your credentials:
   ```bash
   cp .env.example .env
   ```
4. **Run Migrations & Seeding**
   ```bash
   npm run migrate
   npm run seed
   ```
5. **Start the Development Server**
   ```bash
   npm run dev
   ```

---

## 6. Environment Variables
The application requires the following environment variables (defined in `.env`):
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/node_billing"
JWT_SECRET="your_very_secure_secret_key_that_is_at_least_32_chars_long_123"
```
> **Validation Notice**: Environment variables are strictly validated at startup using Zod (`src/config/env.ts`). `JWT_SECRET` must be at least 32 characters long.

---

## 7. Database Setup & Migrations
The project uses raw SQL for migrations to ensure complete control over tables, foreign keys, constraints, and indexes. 
- Migration execution is managed by `scripts/migrate.ts`, which reads and runs `scripts/schema.sql` inside a database transaction.
- **Run migrations**: `npm run migrate`

---

## 8. Seed Data
A script is provided to pre-populate the database with standard reference subscription plans.
- **Run seeding**: `npm run seed`

### Default Plans
| Name | Price | Currency | Interval | ID |
|---|---|---|---|---|
| Basic Plan | $9.99 | USD | month | `00d6a617-d60e-4353-baaa-f95d2ef0852c` |
| Pro Plan | $29.99 | USD | month | `1a590cce-f6b9-4786-8f3e-821557ad42ea` |

---

## 9. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users {
        uuid id PK
        varchar email
        varchar password_hash
        timestamp created_at
    }
    plans {
        uuid id PK
        varchar name
        numeric price
        varchar currency
        varchar billing_interval
    }
    subscriptions {
        uuid id PK
        uuid user_id FK
        uuid plan_id FK
        varchar status
        timestamp created_at
    }
    payments {
        uuid id PK
        uuid subscription_id FK
        numeric amount
        varchar currency
        varchar status
        varchar provider_reference
        timestamp created_at
    }

    users ||--o{ subscriptions : "has"
    plans ||--o{ subscriptions : "defines"
    subscriptions ||--o{ payments : "generates"
```

---

## 10. API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Registers a new user. Expects `email` & `password`. Returns created user object (no token). |
| `POST` | `/auth/login` | Authenticates user credentials and returns an `accessToken` (JWT). |

### Subscriptions
*(Requires `Authorization: Bearer <token>`)*
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/subscriptions` | Creates a subscription & processes payment atomically. Expects `{ "planId": "<uuid>" }`. |
| `GET` | `/subscriptions/:id` | Fetches subscription details for the authenticated user (enforces ownership). |

---

## 11. Authentication & Security Approach
- **Password Hashing**: Passwords are securely hashed using **Argon2** (Argon2id variant) with automatic salt generation.
- **Stateless Tokens**: Authentication is stateless. Login (`POST /auth/login`) issues a signed JSON Web Token (**JWT**) containing the user ID (`sub` claim) with a 2-hour expiration. Registration (`POST /auth/register`) only creates the user without returning a token.
- **Protection Against User Enumeration**: Both nonexistent users and incorrect passwords return an identical generic `401 Unauthorized ('Invalid email or password')`.

---

## 12. Authorization Approach
- A custom Express middleware ([`src/middleware/auth.ts`](src/middleware/auth.ts)) verifies the cryptographic signature of incoming JWTs using `env.JWT_SECRET`.
- **Resource Ownership**: Endpoints such as `GET /subscriptions/:id` enforce strict ownership checks (`subscription.user_id !== userId`). Accessing another user's subscription returns `403 Forbidden`.

---

## 13. Transaction Handling & Atomicity
When creating a subscription, two distinct database records (`subscriptions` and `payments`) must be persisted atomically:
- `SubscriptionService` acquires a dedicated client from the PostgreSQL pool (`pool.connect()`).
- The entire operation executes between explicit `BEGIN` and `COMMIT` commands.
- If the payment simulation fails or an unexpected database error occurs, `ROLLBACK` is executed, preventing orphaned subscription or payment records.
- The `finally` block ensures `client.release()` is called in all execution paths to prevent connection leaks.

---

## 14. Error Handling & Structured Logging
- **Asynchronous Error Propagation**: All routes are wrapped in an `asyncHandler` utility to catch unhandled promise rejections and forward them to Express error middleware.
- **Standardized Response Envelope**: All client errors return a uniform format:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed: planId: Invalid UUID"
    }
  }
  ```
- **Custom Business Errors**: Domain errors use `AppError` with specific HTTP status codes (e.g., `PLAN_NOT_FOUND` [404], `SUBSCRIPTION_EXISTS` [409], `PAYMENT_FAILED` [402]).
- **Sensitive Data Exclusion**: Pino logger configuration strips sensitive keys (`authorization`, `password`, `password_hash`). Server errors (500) log sanitized error details internally without leaking stack traces or credentials to the API consumer.

---

## 15. Testing
**Vitest** and **Supertest** provide comprehensive integration test coverage against a live PostgreSQL database:
- **Prerequisites**: Ensure PostgreSQL is running, `DATABASE_URL` is set in `.env`, and migrations have been executed (`npm run migrate`).
- **Test Isolation**: `tests/setup.ts` truncates `users`, `subscriptions`, and `payments` tables before each test and reseeds the plans table.
- **Deterministic Mocking**: The `FakePaymentProvider` is spied on using Vitest's `vi.spyOn` to deterministically verify both success and failure rollback scenarios.
- **Execution**: Run tests with:
  ```bash
  npm test
  ```

---

## 16. Important Engineering Decisions & Known Limitations

### Engineering Decisions
- **Raw SQL over ORMs**: Used raw parameterized SQL with the `pg` driver for full control over queries, transaction boundaries, and indexing, eliminating ORM query overhead.
- **Layered Architecture & Dependency Injection**: Controllers handle HTTP contracts, services orchestrate business workflows, and repositories encapsulate SQL. The payment provider is injected via the `PaymentProvider` interface.
- **Dual-Layer Concurrency Protection**: TOCTOU race conditions are defended both by an application-level guard and an atomic PostgreSQL partial unique index.

### Known Limitations / Production Improvements
- **Live Payment Gateway**: Integrate Stripe or Braintree SDK with webhook idempotency keys.
- **Rate Limiting**: Add Redis-backed rate limiting on auth routes to prevent brute-force attacks.
- **Pagination & Indexing**: Implement cursor-based pagination for subscription history as data volume grows.
- **Refresh Tokens**: Implement refresh-token rotation for seamless session renewal without compromising security.
