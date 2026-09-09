# Node Billing Engine

A robust, production-ready backend service for managing user subscriptions and processing payments, built with Node.js, Express, and PostgreSQL.

---

## 1. Project Overview
The Node Billing Engine is a scalable RESTful API designed to handle secure user authentication, authorization, and the atomic creation of subscriptions and payment records. It is designed to act as the core billing infrastructure for SaaS applications.

## 2. Architecture Overview
The application follows a clean layered architecture, ensuring separation of concerns and high testability.

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

## 3. Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (with `pg` driver)
- **Language**: TypeScript
- **Authentication**: JWT (JSON Web Tokens) & Argon2 (password hashing)
- **Validation**: Zod
- **Logging**: Pino
- **Testing**: Vitest & Supertest

## 4. How to Run Locally

### Prerequisites
- Node.js (v18+)
- Docker (for PostgreSQL)

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
   Rename `.env.example` to `.env` and adjust variables if needed.
4. **Run Migrations & Seeding**
   ```bash
   npm run migrate
   npm run seed
   ```
5. **Start the Server**
   ```bash
   npm run dev
   ```

## 5. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/node_billing"
JWT_SECRET="your_very_secure_secret_key_that_is_at_least_32_chars_long_123"
```

## 6. Database Setup & Migrations
The project uses raw SQL for migrations to ensure complete control over schemas and indexes. Migrations are executed chronologically from the `migrations/` folder.
- Run migrations: `npm run migrate`

## 7. Seed Data
A script is provided to pre-populate the database with reference data (Plans).
- Run seeding: `npm run seed`

### Default Plans
| Name | Price | Currency | Interval | ID |
|---|---|---|---|---|
| Basic Plan | $9.99 | USD | month | `00d6a617-d60e-4353-baaa-f95d2ef0852c` |
| Pro Plan | $29.99 | USD | month | `1a590cce-f6b9-4786-8f3e-821557ad42ea` |

---

## 8. Entity Relationship Diagram (ERD)

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

## 9. API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Creates a new user. Expects `email` & `password`. |
| `POST` | `/auth/login` | Authenticates a user and returns a `accessToken`. |

### Subscriptions
*(Requires `Authorization: Bearer <token>`)*
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/subscriptions` | Creates a subscription & payment. Expects `planId`. |
| `GET` | `/subscriptions/:id` | Fetches details of a specific subscription. |

---

## 10. Authentication Approach
Authentication is purely stateless. Upon successful registration or login (passwords securely hashed using **Argon2**), the server issues a JSON Web Token (**JWT**). The client must include this token in the `Authorization: Bearer` header for protected routes.

## 11. Authorization Approach
A custom Express middleware (`requireAuth`) decodes and verifies the JWT. If the token is missing or invalid, a `401 Unauthorized` is returned. Furthermore, resource-level authorization strictly ensures users can only access their own data. Attempting to fetch another user's subscription returns a `403 Forbidden`.

## 12. Transaction Handling
When creating a subscription, two distinct database records (`subscriptions` and `payments`) must be persisted atomically. The `SubscriptionService` utilizes PostgreSQL transactions (`BEGIN`, `COMMIT`, `ROLLBACK`). If the simulated payment provider fails, or if a unique constraint is violated (e.g., duplicate active subscription), the entire transaction is rolled back, preventing orphaned records.

## 13. Error Handling
All routes are wrapped in an `asyncHandler` to safely catch unhandled promise rejections. A global `errorHandler` middleware standardizes API responses. Expected business logic errors throw a custom `AppError` class containing specific status codes and error codes (e.g., `VALIDATION_ERROR`, `PAYMENT_FAILED`).

## 14. Testing
**Vitest** and **Supertest** are used for comprehensive integration testing. 
- A global `tests/setup.ts` isolates tests by truncating the database before each test run. 
- The `PaymentProvider` is mocked using `vi.spyOn` to simulate real-world successes and failures deterministically.
- Run tests via `npm run test`.

## 15. Important Engineering Decisions & Known Limitations

### Engineering Decisions
- **Raw SQL over ORMs**: Used raw SQL with the `pg` driver to maintain strict control over queries, indexes, and transactions, eliminating ORM overhead.
- **Service/Repository Pattern**: Extracted all business logic out of controllers into services, and all SQL queries into repositories to ensure the system is highly testable and loosely coupled.

### Known Limitations / Production Improvements
- **Real Payment Integration**: The system currently uses a `FakePaymentProvider`. For production, the `PaymentProvider` interface should be implemented using the Stripe or Braintree SDK.
- **Rate Limiting**: Integration of Redis to implement rate limiting on authentication routes (preventing brute-force attacks).
- **Pagination & Indexing**: As data scales, indexing frequently queried fields (e.g., `user_id` on subscriptions) and paginating API endpoints will be necessary.
- **Refresh Tokens**: Implement a refresh-token rotation strategy to allow for short-lived access tokens without forcing users to repeatedly log in.
