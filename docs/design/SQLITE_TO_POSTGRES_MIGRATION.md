# SQLite to PostgreSQL Migration Design Document

**Author:** Claude
**Date:** 2026-01-01
**Status:** Draft - Pending Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture](#current-architecture)
3. [Why Migrate to PostgreSQL?](#why-migrate-to-postgresql)
4. [Phase 1: Local PostgreSQL Setup](#phase-1-local-postgresql-setup)
5. [Phase 2: Schema Translation](#phase-2-schema-translation)
6. [Phase 3: Testing Strategy](#phase-3-testing-strategy)
7. [Phase 4: Netlify Deployment](#phase-4-netlify-deployment)
8. [Phase 5: Replacing Trigger.dev](#phase-5-replacing-triggerdev)
9. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

This document outlines the migration from SQLite to PostgreSQL for the Perpetually license management platform, deployed to **Netlify** with **Netlify DB** (powered by Neon).

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Netlify | Official TanStack Start support, integrated DB |
| Database (prod) | Netlify DB (Neon) | Auto-provisioned, zero config |
| Database (local) | Docker PostgreSQL | Matches production |
| Scheduled Jobs | Netlify Scheduled Functions | Native, no external services |
| UUID Strategy | Native UUID | Better performance, type safety |
| Timestamps | Native TIMESTAMPTZ | Timezone-aware, simpler queries |

---

## Current Architecture

### Database Stack
- **Database:** SQLite via libsql
- **ORM:** Drizzle ORM v2 (beta)
- **Schema:** 14 tables with full relational definitions

### Current Test Setup
- **Framework:** Vitest with Bun runtime
- **Pattern:** Tests hit real database via Hono app's `fetch()` method
- **Data:** Created/cleaned up per test suite in `helpers.ts`
- **Location:** `src/lib/api/__tests__/*.test.ts`

### Background Jobs
- **Trigger.dev:** Single scheduled task (`license-expiry-notifications`)
- **Schedule:** Daily at 9:00 AM UTC

---

## Why Migrate to PostgreSQL?

| SQLite Limitation | PostgreSQL Solution |
|-------------------|---------------------|
| Single-writer lock (webhook bottleneck) | MVCC concurrent writes |
| Complex date math in JS | Native `INTERVAL` arithmetic |
| No JSON querying | JSONB with GIN indexes |
| No replication | Streaming replication |
| File-based (deployment complexity) | Netlify DB auto-provisioning |

---

## Phase 1: Local PostgreSQL Setup

### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    container_name: perpetually-postgres
    environment:
      POSTGRES_USER: perpetually
      POSTGRES_PASSWORD: perpetually
      POSTGRES_DB: perpetually
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U perpetually"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: pgAdmin for visual database management
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: perpetually-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@perpetually.dev
      PGADMIN_DEFAULT_PASSWORD: admin
      PGADMIN_CONFIG_SERVER_MODE: "False"
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy
    profiles:
      - tools  # Only start with: docker compose --profile tools up

volumes:
  postgres_data:
  pgadmin_data:
```

### Database Initialization Script

```sql
-- scripts/init-db.sql
-- Create test database
CREATE DATABASE perpetually_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE perpetually TO perpetually;
GRANT ALL PRIVILEGES ON DATABASE perpetually_test TO perpetually;

-- Enable extensions (for both databases)
\c perpetually
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c perpetually_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Environment Variables

```bash
# .env.local (development)
DATABASE_URL=postgresql://perpetually:perpetually@localhost:5432/perpetually

# .env.test (testing)
DATABASE_URL=postgresql://perpetually:perpetually@localhost:5432/perpetually_test

# .env.production (production - example for Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/perpetually?sslmode=require
```

### Updated package.json Scripts

```json
{
  "scripts": {
    "dev": "bun --bun vite dev",
    "build": "bun --bun vite build",
    "start": "bun run .output/server/index.mjs",

    "db:start": "docker compose up -d postgres",
    "db:stop": "docker compose down",
    "db:logs": "docker compose logs -f postgres",
    "db:psql": "docker compose exec postgres psql -U perpetually",
    "db:reset": "docker compose down -v && docker compose up -d postgres",

    "db:generate": "bunx drizzle-kit generate",
    "db:migrate": "bunx drizzle-kit migrate",
    "db:push": "bunx drizzle-kit push",
    "db:seed": "bun --env-file=.env.local ./scripts/seed.ts",
    "db:setup": "bun run db:start && sleep 2 && bun run db:migrate && bun run db:seed",

    "test": "bun --bun test",
    "test:db": "DATABASE_URL=postgresql://perpetually:perpetually@localhost:5432/perpetually_test bun --bun test",
    "test:migrate": "DATABASE_URL=postgresql://perpetually:perpetually@localhost:5432/perpetually_test bunx drizzle-kit migrate"
  }
}
```

### Development Workflow

```bash
# First time setup
docker compose up -d postgres     # Start PostgreSQL
bun run db:migrate                # Apply migrations
bun run db:seed                   # Seed initial data
bun run dev                       # Start dev server

# Daily development
docker compose up -d postgres     # Ensure PostgreSQL is running
bun run dev                       # Start dev server

# Running tests
bun run test:migrate              # Ensure test DB has latest schema
bun run test                      # Run all tests

# Reset everything
bun run db:reset                  # Wipe and restart PostgreSQL
bun run db:migrate && bun run db:seed
```

---

## Phase 2: Schema Translation

See [Schema Translation](#schema-file-changes) section below for full schema changes.

---

## Phase 3: Testing Strategy

### Test Database Isolation

Tests run against a separate `perpetually_test` database to avoid polluting development data.

### Updated Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Updated Database Connection

```typescript
// src/lib/db/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = drizzle({ client: pool, schema });

export default db;
```

### Test Setup File

```typescript
// src/lib/api/__tests__/setup.ts
import { beforeAll, afterAll } from "vitest";
import db from "@/lib/db/db";
import { sql } from "drizzle-orm";

beforeAll(async () => {
  // Verify we're connected to test database
  const result = await db.execute(sql`SELECT current_database()`);
  const dbName = result.rows[0]?.current_database;

  if (!dbName?.toString().includes("test")) {
    throw new Error(
      `Tests must run against test database! Connected to: ${dbName}`
    );
  }
});

afterAll(async () => {
  // Close connection pool
  await db.$client.end();
});
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/lib/api/__tests__/setup.ts"],
    env: {
      DATABASE_URL: "postgresql://perpetually:perpetually@localhost:5432/perpetually_test",
    },
    // Run tests sequentially to avoid race conditions
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

### Test Helpers Update

```typescript
// src/lib/api/__tests__/helpers.ts
import db from "@/lib/db/db";
import {
  organization,
  secretKey,
  product,
  customer,
  license,
  activation,
  licensePolicy,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import app from "../app";

// ... existing types and helpers remain the same ...

// Add transaction wrapper for test isolation (optional)
export async function withTestTransaction<T>(
  fn: () => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    const result = await fn();
    // Rollback after test
    throw new Error("ROLLBACK");
  }).catch((e) => {
    if (e.message === "ROLLBACK") return undefined as T;
    throw e;
  });
}

// Truncate all tables (faster than individual deletes for full reset)
export async function truncateAllTables() {
  await db.execute(sql`
    TRUNCATE TABLE
      activation,
      license_event,
      license,
      license_policy,
      customer,
      product,
      secret_key,
      invitation,
      membership,
      session,
      account,
      verification,
      organization,
      "user"
    RESTART IDENTITY CASCADE
  `);
}
```

### CI/CD Testing

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: perpetually
          POSTGRES_PASSWORD: perpetually
          POSTGRES_DB: perpetually_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - name: Run migrations
        run: bunx drizzle-kit migrate
        env:
          DATABASE_URL: postgresql://perpetually:perpetually@localhost:5432/perpetually_test

      - name: Run tests
        run: bun --bun test
        env:
          DATABASE_URL: postgresql://perpetually:perpetually@localhost:5432/perpetually_test
```

---

## Phase 4: Netlify Deployment

### Why Netlify?

- **Official TanStack Start plugin** - First-class support
- **Netlify DB** - PostgreSQL (Neon) with auto-injected connection strings
- **Scheduled Functions** - Native cron replacement for Trigger.dev
- **Edge Functions** - Fast API responses globally

### Install Netlify Plugin

```bash
bun add -D @netlify/vite-plugin-tanstack-start
```

### Update vite.config.ts

```typescript
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    netlify(),
    viteReact(),
  ],
});
```

### Create netlify.toml

```toml
[build]
  command = "bun run build"
  publish = "dist/client"

[dev]
  command = "bun run dev"
  port = 3001

# Scheduled function for license expiry notifications
[functions."license-expiry-notifications"]
  schedule = "0 9 * * *"
```

### Initialize Netlify DB

```bash
# Install Netlify CLI
bun add -g netlify-cli

# Login to Netlify
netlify login

# Initialize project (creates site + database)
netlify init

# Initialize database with Drizzle boilerplate
netlify db init --boilerplate=drizzle

# Start local dev (auto-connects to dev database)
netlify dev
```

### Environment Variables

Netlify DB auto-injects `DATABASE_URL`. Add other variables in Netlify UI (Site settings → Environment variables):

```bash
BETTER_AUTH_SECRET=your-auth-secret
RESEND_API_KEY=re_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
CRON_SECRET=your-cron-secret  # For scheduled function auth
```

### Claim Your Database

**Important**: Unclaimed databases expire after 7 days!

1. Go to Netlify Dashboard → Your Site → **Extensions**
2. Find **Neon database** → **Connect Neon**
3. Authorize with Neon account
4. Click **Claim database**

This gives you:
- Persistent database (no 7-day expiry)
- Access to Neon console for monitoring
- Production-grade capacity

---

## Phase 5: Replacing Trigger.dev

### Netlify Scheduled Functions

Netlify has native scheduled functions - no external cron service needed.

### Create the Scheduled Function

```typescript
// netlify/functions/license-expiry-notifications.mts
import type { Config, Context } from "@netlify/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { license, customer, product, organization } from "../../src/lib/db/schema";
import { eq, and, lt, gt, isNull, sql } from "drizzle-orm";

// Initialize database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

export default async (req: Request, context: Context) => {
  const { next_run } = await req.json();
  console.log(`[Cron] Running license expiry check. Next run: ${next_run}`);

  const now = new Date();
  const results = { sevenDay: 0, oneDay: 0, expired: 0, errors: [] as string[] };

  try {
    // 7-day warnings
    const sevenDayLicenses = await db
      .select({
        license: license,
        customer: customer,
        product: product,
        organization: organization,
      })
      .from(license)
      .innerJoin(customer, eq(license.customerId, customer.id))
      .innerJoin(product, eq(license.productId, product.id))
      .innerJoin(organization, eq(license.organizationId, organization.id))
      .where(and(
        eq(license.status, "active"),
        isNull(license.expiryNotified7DaysAt),
        gt(license.expiresAt, sql`NOW() + INTERVAL '6 days'`),
        lt(license.expiresAt, sql`NOW() + INTERVAL '8 days'`)
      ))
      .limit(100);

    for (const row of sevenDayLicenses) {
      try {
        // Send email via Resend
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "noreply@perpetually.dev",
            to: row.customer.email,
            subject: `Your ${row.product.name} license expires in 7 days`,
            html: `<p>Hi ${row.customer.name}, your license expires on ${row.license.expiresAt?.toLocaleDateString()}.</p>`,
          }),
        });

        await db.update(license)
          .set({ expiryNotified7DaysAt: now })
          .where(eq(license.id, row.license.id));

        results.sevenDay++;
      } catch (error) {
        results.errors.push(`7-day ${row.license.id}: ${error}`);
      }
    }

    // 1-day warnings (similar pattern)
    const oneDayLicenses = await db
      .select({ license, customer, product, organization })
      .from(license)
      .innerJoin(customer, eq(license.customerId, customer.id))
      .innerJoin(product, eq(license.productId, product.id))
      .innerJoin(organization, eq(license.organizationId, organization.id))
      .where(and(
        eq(license.status, "active"),
        isNull(license.expiryNotified1DayAt),
        gt(license.expiresAt, sql`NOW()`),
        lt(license.expiresAt, sql`NOW() + INTERVAL '2 days'`)
      ))
      .limit(100);

    for (const row of oneDayLicenses) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "noreply@perpetually.dev",
            to: row.customer.email,
            subject: `Your ${row.product.name} license expires tomorrow`,
            html: `<p>Hi ${row.customer.name}, your license expires tomorrow!</p>`,
          }),
        });

        await db.update(license)
          .set({ expiryNotified1DayAt: now })
          .where(eq(license.id, row.license.id));

        results.oneDay++;
      } catch (error) {
        results.errors.push(`1-day ${row.license.id}: ${error}`);
      }
    }

    // Expired notifications
    const expiredLicenses = await db
      .select({ license, customer, product, organization })
      .from(license)
      .innerJoin(customer, eq(license.customerId, customer.id))
      .innerJoin(product, eq(license.productId, product.id))
      .innerJoin(organization, eq(license.organizationId, organization.id))
      .where(and(
        eq(license.status, "active"),
        isNull(license.expiryNotifiedExpiredAt),
        lt(license.expiresAt, sql`NOW()`)
      ))
      .limit(100);

    for (const row of expiredLicenses) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "noreply@perpetually.dev",
            to: row.customer.email,
            subject: `Your ${row.product.name} license has expired`,
            html: `<p>Hi ${row.customer.name}, your license has expired.</p>`,
          }),
        });

        await db.update(license)
          .set({ expiryNotifiedExpiredAt: now })
          .where(eq(license.id, row.license.id));

        results.expired++;
      } catch (error) {
        results.errors.push(`expired ${row.license.id}: ${error}`);
      }
    }

    console.log(`[Cron] Complete:`, results);
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[Cron] Fatal error:`, error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  schedule: "0 9 * * *",  // Daily at 9:00 AM UTC
};
```

### Scheduled Functions Limitations

| Aspect | Details |
|--------|---------|
| **Execution limit** | 30 seconds (use Background Functions for longer) |
| **Runs on** | Published deploys only (not previews) |
| **Cannot** | Be invoked directly via URL |
| **Testing** | Use "Run now" button in Netlify Functions dashboard |

### Remove Trigger.dev

```bash
# Delete Trigger.dev files
rm -rf src/trigger/
rm trigger.config.ts

# Remove dependencies
bun remove @trigger.dev/sdk @trigger.dev/build trigger.dev
```

Remove from package.json:
```json
{
  "scripts": {
    // DELETE these:
    "trigger:dev": "...",
    "trigger:deploy": "..."
  }
}
```

---

## Schema Translation

### Type Mapping

| SQLite | PostgreSQL |
|--------|------------|
| `text("id")` | `uuid("id").defaultRandom()` |
| `integer("ts", {mode: "timestamp_ms"})` | `timestamp("ts", {withTimezone: true}).defaultNow()` |
| `text("data", {mode: "json"})` | `jsonb("data")` |
| `integer("bool", {mode: "boolean"})` | `boolean("bool")` |

### Schema File Changes

```typescript
// src/lib/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { defineRelations } from "drizzle-orm";

// ============================================
// User & Auth (Better Auth)
// ============================================

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: uuid("active_organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("session_user_idx").on(table.userId),
]);

// ============================================
// Organization & Membership
// ============================================

export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  apiKey: text("api_key"),
  isOnboarded: boolean("is_onboarded").default(false),

  // Stripe Connect (customer payments)
  stripeConnectId: text("stripe_connect_id"),
  stripeAccessToken: text("stripe_access_token"),
  stripeRefreshToken: text("stripe_refresh_token"),
  stripeWebhookSecret: text("stripe_webhook_secret"),

  // Perpetually billing
  subscriptionTier: text("subscription_tier", {
    enum: ["free", "starter", "business"],
  }).default("free"),
  subscriptionStatus: text("subscription_status", {
    enum: ["active", "past_due", "canceled", "trialing"],
  }),
  billingStripeCustomerId: text("billing_stripe_customer_id"),
  billingStripeSubscriptionId: text("billing_stripe_subscription_id"),

  // Branding (business tier)
  brandingEnabled: boolean("branding_enabled").default(false),
  brandLogo: text("brand_logo"),
  brandAccentColor: text("brand_accent_color"),
  brandSupportEmail: text("brand_support_email"),
  brandHidePoweredBy: boolean("brand_hide_powered_by").default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
});

export const membership = pgTable("membership", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role", { enum: ["owner", "admin", "member"] }).default("member").notNull(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("membership_unique").on(table.userId, table.organizationId),
  index("membership_org_idx").on(table.organizationId),
]);

// ============================================
// License Domain
// ============================================

export const license = pgTable("license", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  keyCreatedAt: timestamp("key_created_at", { withTimezone: true }).notNull(),
  status: text("status", { enum: ["active", "disabled"] }).default("active").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  activationLimit: integer("activation_limit"),

  // Disable info
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  disabledReason: text("disabled_reason", {
    enum: ["refund", "chargeback", "abuse", "customer_request", "other"],
  }),
  disabledNotes: text("disabled_notes"),

  // Stripe
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  isTest: boolean("is_test").default(false),

  // Expiry notifications
  expiryNotified7DaysAt: timestamp("expiry_notified_7_days_at", { withTimezone: true }),
  expiryNotified1DayAt: timestamp("expiry_notified_1_day_at", { withTimezone: true }),
  expiryNotifiedExpiredAt: timestamp("expiry_notified_expired_at", { withTimezone: true }),

  // Relations
  productId: uuid("product_id").notNull().references(() => product.id),
  customerId: uuid("customer_id").notNull().references(() => customer.id),
  organizationId: uuid("organization_id").notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  licensePolicyId: uuid("license_policy_id").references(() => licensePolicy.id),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("license_org_idx").on(table.organizationId),
  index("license_customer_idx").on(table.customerId),
  index("license_product_idx").on(table.productId),
  index("license_expires_idx").on(table.expiresAt),
  index("license_status_idx").on(table.status),
]);

// ... Continue for all other tables (product, customer, activation, etc.)
// Pattern is the same: uuid IDs, timestamp with timezone, boolean, jsonb
```

---

## Implementation Checklist

### Phase 1: Local PostgreSQL ✦ Validate Locally First

```bash
# 1. Install PostgreSQL driver
bun add pg
bun remove @libsql/client

# 2. Create docker-compose.yml and scripts/init-db.sql
# (See Phase 1 section above)

# 3. Start PostgreSQL
docker compose up -d postgres

# 4. Update drizzle.config.ts and src/lib/db/db.ts
# (See Phase 1 section above)

# 5. Update schema to PostgreSQL types
# (See Schema File Changes section above)

# 6. Generate and run migrations
bun run db:generate
bun run db:migrate

# 7. Seed data
bun run db:seed

# 8. Start dev server and test
bun run dev
```

**Validate locally:**
- [ ] App starts without errors
- [ ] Can register/login
- [ ] Can create organization
- [ ] Can create products, customers, licenses
- [ ] License activation API works
- [ ] All existing tests pass: `bun run test`

---

### Phase 2: Netlify Setup

```bash
# 1. Install Netlify dependencies
bun add -D @netlify/vite-plugin-tanstack-start netlify-cli @netlify/functions

# 2. Update vite.config.ts with Netlify plugin
# (See Phase 4 section above)

# 3. Create netlify.toml
# (See Phase 4 section above)

# 4. Login and initialize
netlify login
netlify init

# 5. Initialize Netlify DB
netlify db init

# 6. Test with Netlify dev server
netlify dev
```

**Validate with Netlify dev:**
- [ ] `netlify dev` connects to Netlify DB
- [ ] All features work as before
- [ ] Environment variables injected correctly

---

### Phase 3: Deploy to Netlify

```bash
# 1. Deploy to Netlify
netlify deploy --prod

# 2. Add environment variables in Netlify UI:
#    - BETTER_AUTH_SECRET
#    - RESEND_API_KEY
#    - STRIPE_SECRET_KEY
#    - STRIPE_WEBHOOK_SECRET

# 3. Claim your database (IMPORTANT - expires in 7 days otherwise!)
#    Netlify Dashboard → Extensions → Neon database → Claim

# 4. Run migrations on production
DATABASE_URL=<prod-url> bun run db:migrate
```

**Validate production:**
- [ ] Site loads at Netlify URL
- [ ] User registration/login works
- [ ] Database connected (can create data)
- [ ] Stripe webhooks work (update webhook URL in Stripe dashboard)

---

### Phase 4: Scheduled Function

```bash
# 1. Create netlify/functions/license-expiry-notifications.mts
# (See Phase 5 section above)

# 2. Deploy
netlify deploy --prod

# 3. Test scheduled function
#    Netlify Dashboard → Functions → license-expiry-notifications → Run now

# 4. Remove Trigger.dev
rm -rf src/trigger/ trigger.config.ts
bun remove @trigger.dev/sdk @trigger.dev/build trigger.dev
```

**Validate scheduled function:**
- [ ] Function appears in Netlify Functions dashboard
- [ ] "Run now" executes successfully
- [ ] Check logs for any errors
- [ ] Verify emails sent (check Resend dashboard)

---

### Phase 5: Final Cleanup

**Update Stripe webhooks:**
- [ ] Stripe Dashboard → Webhooks → Update endpoint URL to Netlify
- [ ] Update Stripe Connect OAuth callback URL

**Update DNS (if custom domain):**
- [ ] Add custom domain in Netlify
- [ ] Update DNS records
- [ ] Verify SSL certificate

**Remove old infrastructure:**
- [ ] Delete SQLite database file
- [ ] Remove old deployment (if any)
- [ ] Update any documentation/READMEs

---

## Quick Reference: File Changes Summary

| File | Action |
|------|--------|
| `docker-compose.yml` | Create |
| `scripts/init-db.sql` | Create |
| `netlify.toml` | Create |
| `netlify/functions/license-expiry-notifications.mts` | Create |
| `drizzle.config.ts` | Update dialect to postgresql |
| `src/lib/db/db.ts` | Update to use pg Pool |
| `src/lib/db/schema.ts` | Update to pgTable, uuid, timestamp |
| `vite.config.ts` | Add Netlify plugin |
| `package.json` | Add pg, @netlify/*, remove @libsql/client, @trigger.dev/* |
| `src/trigger/` | Delete |
| `trigger.config.ts` | Delete |
