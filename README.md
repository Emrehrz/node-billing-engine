# Subscription & Payment API

A small but production-minded REST API for a fitness SaaS platform, demonstrating clean architecture, security, and structured development.

## Overview

This API manages users, subscription plans, and simulated payments for a fitness application. It enforces rules such as unique active subscriptions and data integrity without relying on ORMs.

### Core Entities

- **Users**: Authentication via Argon2 and JWT.
- **Plans**: Various subscription tiers with robust monetary tracking (PostgreSQL NUMERIC).
- **Subscriptions**: The link between users and plans, strictly maintaining one active/pending subscription per user via database-level invariants.
- **Payments**: Transactional payment processing securely tracking status.

## Technology Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL (with `pg` driver, parameterized SQL used exclusively)
- **Validation:** Zod
- **Security:** JWT, Argon2
- **Logging:** Pino (Structured logging)
- **Testing:** Vitest

## Getting Started

*(Instructions will be added as the project structure is completed)*
