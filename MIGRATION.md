# Migration Spec: Dash (Remix) → TanStack Start

## Overview

Migrate the license management SaaS dashboard from React Router/Remix to TanStack Start, replacing the `letsgo` directory with the new application.

### Key Decisions

| Decision | Choice |
|----------|--------|
| Database | SQLite (libsql) |
| Multi-tenancy | By `organizationId` (rename from `teamId`) |
| Authentication | better-auth with email/password |
| Framework | TanStack Start |
| Location | Replace `letsgo/` directory |
| API | Migrate later (keep `apps/api` for now) |
| User migration | Fresh start (no data migration) |
| **Styling** | Keep from dash (Tailwind classes, component styling) |

---

## Progress Tracker

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Project Setup | **COMPLETED** | Cleaned letsgo, updated schema, updated package.json |
| Phase 2: Database Schema | **COMPLETED** | New schema in place (via Phase 1) |
| Phase 3: Auth Setup | **COMPLETED** | Session with org context, register with org creation |
| Phase 4: Routes Structure | **COMPLETED** | All routes created for Products, Licenses, Customers, Settings |
| Phase 5: Server Functions | **COMPLETED** | All CRUD functions for Products, Licenses, Customers, Settings |
| Phase 6: Components | **COMPLETED** | Using shadcn/ui components, all pages have full UI |
| Phase 7: Onboarding + Stripe | Pending | |
| Phase 8: Testing | Pending | |
| Phase 9: Cleanup | Pending | |

### Completed Tasks (Phase 1)

- [x] Delete `src/functions/todos.ts`
- [x] Delete `src/functions/weights.ts`
- [x] Delete `src/functions/runs.ts`
- [x] Delete `src/functions/import.ts`
- [x] Delete `src/routes/api/strava-webhook.ts`
- [x] Delete `src/routes/api/import.ts`
- [x] Delete `src/routes/api/recurring-todos.trigger.tsx`
- [x] Delete `src/routes/_auth/board/`
- [x] Delete `src/routes/_auth/weights/`
- [x] Delete `src/routes/_auth/best-efforts/`
- [x] Delete `src/routes/_auth/runs/`
- [x] Delete `src/routes/_auth/recurring/`
- [x] Delete fitness-related components (`activity-map.tsx`, `search-form.tsx`, `version-switcher.tsx`)
- [x] Update `app-sidebar.tsx` with license management navigation
- [x] Update `package.json` (name: perpetually-dash, add stripe, remove strava, remove @dnd-kit)
- [x] Update `schema.ts` with full license management schema
- [x] Delete old drizzle migrations (`drizzle/` folder)
- [x] Update `scripts/seed.ts` for new schema (creates test user, org, products, customers, licenses)

### Completed Tasks (Phase 3)

- [x] Update `sessions.ts` to include organization context (memberships + currentOrganization)
- [x] Update `middleware/auth.ts` to include organizationId in context
- [x] Update `_auth/route.tsx` to redirect to onboarding if no organization
- [x] Create `register.tsx` with two-step flow (account + organization creation)
- [x] Create `logout.tsx` route
- [x] Create `functions/organizations.ts` (createOrganization, updateOrganization)
- [x] Create `_auth/onboarding/index.tsx` placeholder

### Completed Tasks (Phase 4-6)

- [x] Create `functions/products.ts` (getProducts, getProduct, createProduct, updateProduct, deleteProduct, createRelease, createLicensePolicy)
- [x] Create `routes/_auth/products/index.tsx` (list with create dialog)
- [x] Create `routes/_auth/products/$productId.tsx` (detail with releases/policies)
- [x] Create `functions/licenses.ts` (getLicenses, getLicense, createLicense, updateLicense, createActivation, deleteActivation, revokeLicense)
- [x] Create `routes/_auth/licenses/index.tsx` (list with create dialog)
- [x] Create `routes/_auth/licenses/$licenseId.tsx` (detail with activations)
- [x] Create `functions/customers.ts` (getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer)
- [x] Create `routes/_auth/customers/index.tsx` (list with create dialog)
- [x] Create `routes/_auth/customers/$customerId.tsx` (detail with licenses)
- [x] Create `functions/settings.ts` (getOrganizationSettings, updateOrganizationSettings, getTeamMembers, updateTeamMemberRole, removeTeamMember, getApiKeys, createApiKey, deleteApiKey)
- [x] Create `routes/_auth/settings/index.tsx` (general settings)
- [x] Create `routes/_auth/settings/team.tsx` (team management)
- [x] Create `routes/_auth/settings/api.tsx` (API keys)
- [x] Install shadcn/ui alert-dialog component
- [x] Update schema: added `company` to customer, `lastSeenAt` to activation

---

## Phase 1: Project Setup

### 1.1 Clean letsgo directory

Remove all letsgo-specific features:
- [ ] Delete `src/functions/todos.ts`
- [ ] Delete `src/functions/weights.ts`
- [ ] Delete `src/functions/runs.ts`
- [ ] Delete `src/functions/import.ts`
- [ ] Delete `src/routes/api/strava-webhook.ts`
- [ ] Delete `src/routes/api/import.ts`
- [ ] Delete `src/routes/api/recurring-todos.trigger.tsx`
- [ ] Delete `src/routes/_auth/board/`
- [ ] Delete `src/routes/_auth/weights/`
- [ ] Delete `src/routes/_auth/best-efforts/`
- [ ] Delete `src/routes/_auth/runs/`
- [ ] Delete `src/routes/_auth/recurring/`
- [ ] Delete fitness-related components

### 1.2 Update package.json

Update project name and dependencies:
```json
{
  "name": "perpetually-dash",
  "dependencies": {
    "stripe": "^17.x",
    "nanoid": "^5.x"
  }
}
```

### 1.3 Environment Variables

Create `.env` template:
```bash
# Database
DATABASE_URL=file:perpetually.db

# Auth
BETTER_AUTH_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Stripe
STRIPE_SECRET_KEY=sk_...

# App
APP_URL=https://perpetually.dev
```

---

## Phase 2: Database Schema

### 2.1 New Schema Design

Replace `src/lib/db/schema.ts` with license management schema:

```typescript
import { defineRelations, sql } from "drizzle-orm";
import { text, integer, sqliteTable, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// ==================== BETTER-AUTH TABLES ====================
// Keep: user, session, account, verification (required by better-auth)

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  userIdIdx: index("session_userId_idx").on(table.userId),
}));

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  userIdIdx: index("account_userId_idx").on(table.userId),
}));

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  identifierIdx: index("verification_identifier_idx").on(table.identifier),
}));

// ==================== ORGANIZATION (Multi-tenancy) ====================

export const organization = sqliteTable("organization", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  // Public API key for client-side license validation
  apiKey: text("api_key").notNull(),

  // Onboarding state
  isOnboarded: integer("is_onboarded", { mode: "boolean" }).default(false).notNull(),

  // Stripe integration
  stripeApiKey: text("stripe_api_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeCustomerId: text("stripe_customer_id"),
  checkoutSessionId: text("checkout_session_id"),
});

// ==================== MEMBERSHIP (User <-> Organization) ====================

export const membership = sqliteTable("membership", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),

  role: text("role", { enum: ["owner", "admin", "member"] }).notNull().default("member"),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
}, (table) => ({
  userIdIdx: index("membership_userId_idx").on(table.userId),
  orgIdIdx: index("membership_orgId_idx").on(table.organizationId),
  uniqueMembership: uniqueIndex("membership_unique").on(table.userId, table.organizationId),
}));

// ==================== PRODUCT ====================

export const product = sqliteTable("product", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "active", "archived"] }).notNull().default("pending"),
  stripeProductId: text("stripe_product_id"),

  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
}, (table) => ({
  orgIdIdx: index("product_orgId_idx").on(table.organizationId),
  slugOrgUnique: uniqueIndex("product_slug_org_unique").on(table.slug, table.organizationId),
}));

// ==================== RELEASE ====================

export const release = sqliteTable("release", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  tag: text("tag").notNull(), // e.g., "v1.0.0"
  description: text("description"),

  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
}, (table) => ({
  productIdIdx: index("release_productId_idx").on(table.productId),
}));

// ==================== LICENSE POLICY ====================

export const licensePolicy = sqliteTable("license_policy", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  name: text("name").notNull(),
  type: text("type", { enum: ["perpetual", "subscription", "trial"] }).notNull(),
  licenseLengthDays: integer("license_length_days").notNull(), // Duration in days
  activationLimit: integer("activation_limit"), // null = unlimited

  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
}, (table) => ({
  productIdIdx: index("license_policy_productId_idx").on(table.productId),
}));

// ==================== CUSTOMER ====================

export const customer = sqliteTable("customer", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  name: text("name").notNull(),
  email: text("email").notNull(),

  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
}, (table) => ({
  orgIdIdx: index("customer_orgId_idx").on(table.organizationId),
  emailOrgUnique: uniqueIndex("customer_email_org_unique").on(table.email, table.organizationId),
}));

// ==================== LICENSE ====================

export const license = sqliteTable("license", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  // License key (unique, user-facing)
  key: text("key").notNull().unique(),
  keyCreatedAt: integer("key_created_at", { mode: "timestamp_ms" }).notNull(),

  // Status
  status: text("status", { enum: ["active", "expired", "suspended", "revoked"] }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),

  // Limits (copied from policy at creation, can be overridden)
  activationLimit: integer("activation_limit"), // null = unlimited

  // Relations
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  licensePolicyId: text("license_policy_id")
    .references(() => licensePolicy.id, { onDelete: "set null" }),
}, (table) => ({
  orgIdIdx: index("license_orgId_idx").on(table.organizationId),
  productIdIdx: index("license_productId_idx").on(table.productId),
  customerIdIdx: index("license_customerId_idx").on(table.customerId),
  statusIdx: index("license_status_idx").on(table.status),
}));

// ==================== ACTIVATION ====================

export const activation = sqliteTable("activation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  // Machine/device identifier
  name: text("name"), // Optional friendly name
  machineId: text("machine_id"), // Hardware fingerprint

  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  licenseId: text("license_id")
    .notNull()
    .references(() => license.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
}, (table) => ({
  licenseIdIdx: index("activation_licenseId_idx").on(table.licenseId),
  orgIdIdx: index("activation_orgId_idx").on(table.organizationId),
}));

// ==================== SECRET KEY (API Authentication) ====================

export const secretKey = sqliteTable("secret_key", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),

  // The actual secret key (hashed or encrypted in production)
  key: text("key").notNull(),
  name: text("name"), // Optional friendly name

  // Scope/permissions
  scopes: text("scopes", { mode: "json" }).$type<string[]>().default([]),

  // Optional expiry
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),

  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
}, (table) => ({
  orgIdIdx: index("secret_key_orgId_idx").on(table.organizationId),
}));

// ==================== RELATIONS ====================

export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    organization,
    membership,
    product,
    release,
    licensePolicy,
    customer,
    license,
    activation,
    secretKey,
  },
  (r) => ({
    // Auth relations
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      memberships: r.many.membership(),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },

    // Organization relations
    organization: {
      memberships: r.many.membership(),
      products: r.many.product(),
      customers: r.many.customer(),
      licenses: r.many.license(),
      activations: r.many.activation(),
      secretKeys: r.many.secretKey(),
    },
    membership: {
      user: r.one.user({
        from: r.membership.userId,
        to: r.user.id,
      }),
      organization: r.one.organization({
        from: r.membership.organizationId,
        to: r.organization.id,
      }),
    },

    // Product relations
    product: {
      organization: r.one.organization({
        from: r.product.organizationId,
        to: r.organization.id,
      }),
      releases: r.many.release(),
      licensePolicies: r.many.licensePolicy(),
      licenses: r.many.license(),
    },
    release: {
      product: r.one.product({
        from: r.release.productId,
        to: r.product.id,
      }),
    },
    licensePolicy: {
      product: r.one.product({
        from: r.licensePolicy.productId,
        to: r.product.id,
      }),
    },

    // Customer relations
    customer: {
      organization: r.one.organization({
        from: r.customer.organizationId,
        to: r.organization.id,
      }),
      licenses: r.many.license(),
    },

    // License relations
    license: {
      organization: r.one.organization({
        from: r.license.organizationId,
        to: r.organization.id,
      }),
      product: r.one.product({
        from: r.license.productId,
        to: r.product.id,
      }),
      customer: r.one.customer({
        from: r.license.customerId,
        to: r.customer.id,
      }),
      licensePolicy: r.one.licensePolicy({
        from: r.license.licensePolicyId,
        to: r.licensePolicy.id,
      }),
      activations: r.many.activation(),
    },

    // Activation relations
    activation: {
      license: r.one.license({
        from: r.activation.licenseId,
        to: r.license.id,
      }),
      organization: r.one.organization({
        from: r.activation.organizationId,
        to: r.organization.id,
      }),
    },

    // Secret key relations
    secretKey: {
      organization: r.one.organization({
        from: r.secretKey.organizationId,
        to: r.organization.id,
      }),
    },
  })
);
```

### 2.2 Generate & Apply Migration

```bash
cd letsgo
bun run db:generate
bun run db:migrate
```

---

## Phase 3: Authentication Setup

### 3.1 Update better-auth config

Update `src/lib/auth.ts`:
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { organization as organizationPlugin } from "better-auth/plugins"; // Optional

import db from "./db/db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
});
```

### 3.2 Update session function

Update `src/functions/sessions.ts` to include organization context:
```typescript
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) return null;

    // Get user's memberships
    const memberships = await db.query.membership.findMany({
      where: { userId: session.user.id },
      with: { organization: true },
    });

    return {
      ...session,
      memberships,
      // Default to first org (can be switched)
      currentOrganization: memberships[0]?.organization ?? null,
    };
  }
);
```

### 3.3 Update auth middleware

Update `src/middleware/auth.ts`:
```typescript
import { createMiddleware } from "@tanstack/react-start";
import { getSessionFn } from "@/functions/sessions";

const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (!session.currentOrganization) {
      throw new Error("No organization - complete onboarding first");
    }

    return next({
      context: {
        session,
        user: session.user,
        organization: session.currentOrganization,
        organizationId: session.currentOrganization.id,
      },
    });
  }
);

export default authMiddleware;
```

---

## Phase 4: Routes Structure

### 4.1 Route Layout

```
src/routes/
├── __root.tsx              # Root layout (providers, toaster)
├── login.tsx               # Public login
├── register.tsx            # Public registration
├── logout.tsx              # Logout action
├── _auth/                  # Protected routes
│   ├── route.tsx           # Auth layout with beforeLoad guard
│   ├── index.tsx           # Dashboard (redirect to products or onboarding)
│   ├── onboarding/
│   │   ├── index.tsx       # Step 1: Stripe connect
│   │   └── webhook.tsx     # Step 2: Webhook setup
│   ├── products/
│   │   ├── index.tsx       # Products list
│   │   ├── new.tsx         # Create product
│   │   └── $productId/
│   │       ├── index.tsx   # Product detail
│   │       ├── edit.tsx    # Edit product
│   │       └── releases/
│   │           ├── new.tsx
│   │           └── $releaseId.edit.tsx
│   ├── licenses/
│   │   ├── index.tsx       # Licenses list
│   │   ├── new.tsx         # Create license
│   │   └── $licenseId/
│   │       ├── index.tsx   # License detail
│   │       └── activations/
│   │           └── new.tsx
│   ├── customers/
│   │   ├── index.tsx       # Customers list
│   │   └── $customerId.tsx # Customer detail
│   ├── settings/
│   │   ├── index.tsx       # General settings
│   │   ├── team.tsx        # Team/members management
│   │   ├── api.tsx         # API keys
│   │   ├── integrations.tsx
│   │   └── subscription.tsx
│   └── support.tsx
├── api/
│   ├── auth/$.ts           # better-auth handler
│   ├── stripe/
│   │   └── connect.ts      # Stripe OAuth callback
│   └── hooks/
│       └── $organizationId.ts  # Stripe webhooks
└── portal/                 # Public customer portal (optional)
    ├── layout.tsx
    └── index.tsx
```

### 4.2 Auth Layout Guard

`src/routes/_auth/route.tsx`:
```typescript
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getSessionFn } from "@/functions/sessions";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    // Check if user needs onboarding
    if (!session.currentOrganization?.isOnboarded) {
      // Allow access to onboarding routes
      // This will be handled in the component
    }

    return {
      user: session.user,
      organization: session.currentOrganization,
      memberships: session.memberships,
    };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
```

---

## Phase 5: Server Functions

### 5.1 Organization Functions

`src/functions/organizations.ts`:
```typescript
import { createServerFn } from "@tanstack/react-start";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { organization, membership } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; slug: string }) => data)
  .handler(async ({ data, context }) => {
    // Context comes from registration flow, not authMiddleware
    const userId = context.userId;

    const apiKey = `pk_${crypto.randomUUID().replace(/-/g, "")}`;

    const [org] = await db
      .insert(organization)
      .values({
        name: data.name,
        slug: data.slug,
        apiKey,
      })
      .returning();

    // Create owner membership
    await db.insert(membership).values({
      userId,
      organizationId: org.id,
      role: "owner",
    });

    return org;
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { name?: string; slug?: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [updated] = await db
      .update(organization)
      .set(data)
      .where(eq(organization.id, organizationId))
      .returning();

    return updated;
  });
```

### 5.2 Product Functions

`src/functions/products.ts`:
```typescript
import { createServerFn } from "@tanstack/react-start";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { product } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const getProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId } }) => {
    return await db.query.product.findMany({
      where: { organizationId },
      with: {
        licenses: true,
        releases: true,
      },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
  });

export const getProduct = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    return await db.query.product.findFirst({
      where: (fields, { and, eq }) =>
        and(
          eq(fields.id, data.productId),
          eq(fields.organizationId, organizationId)
        ),
      with: {
        licenses: { with: { customer: true } },
        releases: true,
        licensePolicies: true,
      },
    });
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { name: string; slug: string; description?: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [newProduct] = await db
      .insert(product)
      .values({
        ...data,
        organizationId,
      })
      .returning();

    return newProduct;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { productId: string; name?: string; slug?: string; description?: string; status?: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const { productId, ...updates } = data;

    const [updated] = await db
      .update(product)
      .set(updates)
      .where(and(eq(product.id, productId), eq(product.organizationId, organizationId)))
      .returning();

    return updated;
  });
```

### 5.3 License Functions

`src/functions/licenses.ts`:
```typescript
import { createServerFn } from "@tanstack/react-start";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { license, activation } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Generate license key (e.g., XXXX-XXXX-XXXX-XXXX)
function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 4;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

export const getLicenses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId } }) => {
    return await db.query.license.findMany({
      where: { organizationId },
      with: {
        customer: true,
        product: true,
        activations: true,
      },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
  });

export const getLicense = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { licenseId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    return await db.query.license.findFirst({
      where: (fields, { and, eq }) =>
        and(
          eq(fields.id, data.licenseId),
          eq(fields.organizationId, organizationId)
        ),
      with: {
        customer: true,
        product: true,
        activations: true,
        licensePolicy: true,
      },
    });
  });

export const createLicense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: {
    productId: string;
    customerId: string;
    expiresAt: string;
    activationLimit?: number;
    licensePolicyId?: string;
  }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const key = generateLicenseKey();
    const now = new Date();

    const [newLicense] = await db
      .insert(license)
      .values({
        key,
        keyCreatedAt: now,
        status: "active",
        expiresAt: new Date(data.expiresAt),
        activationLimit: data.activationLimit ?? null,
        productId: data.productId,
        customerId: data.customerId,
        organizationId,
        licensePolicyId: data.licensePolicyId ?? null,
      })
      .returning();

    return newLicense;
  });

export const createActivation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: {
    licenseId: string;
    name?: string;
    machineId?: string;
  }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    // Check license exists and belongs to org
    const licenseRecord = await db.query.license.findFirst({
      where: (fields, { and, eq }) =>
        and(
          eq(fields.id, data.licenseId),
          eq(fields.organizationId, organizationId)
        ),
      with: { activations: true },
    });

    if (!licenseRecord) {
      throw new Error("License not found");
    }

    // Check activation limit
    if (
      licenseRecord.activationLimit !== null &&
      licenseRecord.activations.length >= licenseRecord.activationLimit
    ) {
      throw new Error("Activation limit reached");
    }

    const [newActivation] = await db
      .insert(activation)
      .values({
        name: data.name,
        machineId: data.machineId,
        licenseId: data.licenseId,
        organizationId,
      })
      .returning();

    return newActivation;
  });
```

### 5.4 Customer Functions

`src/functions/customers.ts`:
```typescript
import { createServerFn } from "@tanstack/react-start";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { customer } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const getCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId } }) => {
    return await db.query.customer.findMany({
      where: { organizationId },
      with: { licenses: true },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { name: string; email: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [newCustomer] = await db
      .insert(customer)
      .values({
        ...data,
        organizationId,
      })
      .returning();

    return newCustomer;
  });
```

---

## Phase 6: Components Migration

### 6.1 Update App Sidebar

Replace fitness-related navigation with license management:

```typescript
// src/components/app-sidebar.tsx
const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Products", url: "/products", icon: Package },
  { title: "Licenses", url: "/licenses", icon: Key },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];
```

### 6.2 Migrate UI Components

Copy from `apps/dash/app/components/`:
- `Page.tsx` → adapt to `PageLayout` pattern
- Form components (adapt Conform → TanStack Form)
- Table components
- Card components

### 6.3 Stripe Integration

`src/lib/stripe.ts`:
```typescript
import Stripe from "stripe";

export function createStripeClient(apiKey: string) {
  return new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
  });
}
```

---

## Phase 7: Onboarding Flow

### 7.1 Registration with Organization Creation

After user registers:
1. Create user account (better-auth handles this)
2. Prompt for organization name/slug
3. Create organization with owner membership
4. Redirect to Stripe onboarding

### 7.2 Stripe Connect Flow

`src/routes/api/stripe/connect.ts`:
```typescript
export const Route = createFileRoute("/api/stripe/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // organizationId

        // Exchange code for API key
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const response = await stripe.oauth.token({
          grant_type: "authorization_code",
          code: code!,
        });

        // Save to organization
        await db
          .update(organization)
          .set({ stripeApiKey: response.access_token })
          .where(eq(organization.id, state!));

        return redirect("/onboarding/webhook");
      },
    },
  },
});
```

### 7.3 Webhook Setup

`src/routes/api/hooks/$organizationId.ts`:
```typescript
export const Route = createFileRoute("/api/hooks/$organizationId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { organizationId } = params;
        const body = await request.text();
        const signature = request.headers.get("Stripe-Signature");

        // Get org's webhook secret
        const org = await db.query.organization.findFirst({
          where: { id: organizationId },
        });

        if (!org?.stripeWebhookSecret) {
          return new Response("Webhook not configured", { status: 400 });
        }

        // Verify signature
        const stripe = createStripeClient(org.stripeApiKey!);
        const event = stripe.webhooks.constructEvent(
          body,
          signature!,
          org.stripeWebhookSecret
        );

        // Handle event
        switch (event.type) {
          case "payment_intent.succeeded":
            // Create license for customer
            break;
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
        });
      },
    },
  },
});
```

---

## Phase 8: Testing & Validation

### 8.1 Test Checklist

- [ ] User registration creates account
- [ ] Organization creation with membership
- [ ] Login/logout flows
- [ ] Protected routes redirect to login
- [ ] Onboarding flow completes
- [ ] CRUD operations for:
  - [ ] Products
  - [ ] Releases
  - [ ] License Policies
  - [ ] Customers
  - [ ] Licenses
  - [ ] Activations
- [ ] Stripe webhook verification
- [ ] License key generation

### 8.2 Run Tests

```bash
cd letsgo
bun run test
```

### 8.3 Validate Build

```bash
pnpm test:ci
```

---

## Phase 9: Cleanup

### 9.1 Remove packages/db dependency

After migration, the `packages/db` package is no longer needed for dash:
- Schema lives in `letsgo/src/lib/db/schema.ts`
- Keep `packages/db` for `apps/api` (migrate later)

### 9.2 Update monorepo config

Update `pnpm-workspace.yaml` if needed.

### 9.3 Update CI/CD

Ensure deployment pipelines point to `letsgo/` for dash builds.

---

## Migration Order (Recommended)

1. **Phase 1**: Clean letsgo, update deps
2. **Phase 2**: Schema migration
3. **Phase 3**: Auth setup
4. **Phase 4**: Route structure (empty routes)
5. **Phase 5**: Server functions
6. **Phase 6**: Components (one feature at a time)
   - Products first (simplest)
   - Then Licenses
   - Then Customers
   - Then Settings
   - Finally Onboarding
7. **Phase 7**: Onboarding + Stripe
8. **Phase 8**: Testing
9. **Phase 9**: Cleanup

---

## Key Pattern Differences

| Aspect | Dash (Remix) | New (TanStack Start) |
|--------|--------------|----------------------|
| Route guard | `requireUserId(request)` in loader | `beforeLoad` in layout route |
| Forms | Conform + `<Form>` | TanStack Form + `useServerFn` |
| Data fetching | `loader` function | Server function or `loader` |
| Mutations | `action` function | Server function |
| Auth context | `request` param | Middleware context |
| Multi-tenancy | `teamId` from session | `organizationId` from middleware |

---

## Files to Reference

**From apps/dash (patterns to adapt):**
- `app/routes/auth/products/` - Product CRUD
- `app/routes/auth/licenses/` - License management
- `app/routes/auth/onboarding/` - Stripe setup
- `app/routes/hooks.$teamId.ts` - Webhook handler
- `app/stripe.server.ts` - Stripe OAuth

**From new.md (patterns to follow):**
- Server function structure
- Form patterns
- Route guard patterns
- Multi-tenancy patterns
