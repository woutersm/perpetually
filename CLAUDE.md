# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
bun install                 # Install dependencies
bun --bun run dev           # Start development server on port 3001
bun --bun run build         # Build for production
bun --bun run preview       # Preview production build
bun run start               # Start production server
```

### Database Operations
```bash
bun run db:generate         # Generate Drizzle migrations from schema
bun run db:migrate          # Apply migrations to database
bun run db:seed             # Seed database with initial data
bun run db:setup            # Run all database setup steps (generate, migrate, seed)
```

### Testing
```bash
bun --bun run test          # Run all tests with Vitest
```

---

## Architecture Overview

### Stack
- **Framework**: TanStack Start (full-stack React framework with TanStack Router)
- **Database**: SQLite with Drizzle ORM v2 (libSQL driver: local file or Turso)
- **Authentication**: Better Auth with email/password
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Payments**: Stripe integration for license purchases
- **Build Tool**: Vite with Nitro server
- **Runtime**: Bun

### Project Structure

```
src/
├── routes/                    # File-based routing
│   ├── __root.tsx            # Root layout (providers, toaster)
│   ├── _auth/                # Protected routes (auth required)
│   │   ├── route.tsx         # Auth layout with beforeLoad guard
│   │   ├── customers/        # Customer management
│   │   ├── products/         # Product management
│   │   ├── licenses/         # License management
│   │   ├── settings/         # Organization settings
│   │   └── onboarding/       # Onboarding flow
│   ├── api/                  # API endpoints
│   │   ├── auth/$.ts         # Better Auth handler
│   │   └── hooks/$orgId.ts   # Stripe webhooks per org
│   ├── login.tsx             # Public login route
│   └── register.tsx          # Public registration route
├── functions/                # Server functions by domain
│   ├── sessions.ts           # Session management
│   ├── organizations.ts      # Org CRUD
│   ├── products.ts           # Product management
│   ├── customers.ts          # Customer management
│   ├── licenses.ts           # License & activation management
│   └── settings.ts           # Org settings
├── lib/
│   ├── db/
│   │   ├── db.ts             # Database connection
│   │   └── schema.ts         # Drizzle schema + relations
│   ├── auth.ts               # Better Auth server config
│   └── auth-client.ts        # Better Auth client
├── middleware/
│   └── auth.ts               # Auth middleware for server functions
└── components/
    ├── ui/                   # shadcn/ui primitives
    ├── data-table/           # Reusable data table components
    └── [component].tsx       # App-specific components
```

### Path Aliases

Always use path aliases for cleaner imports:

```typescript
import db from "@/lib/db/db";
import { auth } from "@/lib/auth";
import { license, customer } from "@/lib/db/schema";
```

---

## Database Patterns (Drizzle ORM v2 with SQLite)

### Schema Definition

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Use text IDs with UUID generation
export const items = sqliteTable("items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Enums as text with options
  status: text("status", { enum: ["pending", "active", "archived"] }),

  // JSON columns stored as text
  data: text("data", { mode: "json" }).$type<MyType>(),

  // Booleans stored as integers
  isActive: integer("is_active", { mode: "boolean" }).default(true),

  // Timestamps as milliseconds (integer)
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

### Relations with `defineRelations`

```typescript
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(
  { organizations, memberships, users },
  (r) => ({
    organizations: {
      memberships: r.many.memberships({
        from: r.organizations.id,
        to: r.memberships.organizationId,
      }),
    },
    memberships: {
      organization: r.one.organizations({
        from: r.memberships.organizationId,
        to: r.organizations.id,
      }),
    },
  })
);
```

**Important**: All `r.many` relations must include explicit `from` and `to` fields.

### Query Patterns (v2 API)

The relational query API (`db.query`) uses **v2 object-based where syntax**:

#### Simple Equality

```typescript
// CORRECT - v2 object syntax
const org = await db.query.organizations.findFirst({
  where: { slug: "my-org" },
});

// WRONG - v1 function syntax (causes "decoder" error)
const org = await db.query.organizations.findFirst({
  where: eq(organizations.slug, "my-org"),  // DON'T DO THIS
});
```

#### Complex Conditions

For operators beyond equality (gt, lt, isNull, etc.), use callback syntax:

```typescript
const pending = await db.query.licenses.findMany({
  where: (fields, { and, eq, gt, isNull }) =>
    and(
      eq(fields.organizationId, orgId),
      gt(fields.expiresAt, new Date()),
      eq(fields.status, "active")
    ),
});
```

#### With Relations

```typescript
const licenseWithActivations = await db.query.license.findFirst({
  where: { id: licenseId },
  with: {
    activations: true,
    customer: true,
    product: true,
  },
});
```

#### Regular Query Builder

The regular query builder still uses `eq()`, `and()` from `drizzle-orm`:

```typescript
import { eq, and, desc } from "drizzle-orm";

// Regular query builder - NOT db.query
await db.update(license)
  .set({ status: "revoked" })
  .where(eq(license.id, licenseId));

// Select with joins
const licenses = await db
  .select({
    id: license.id,
    key: license.key,
    product: { name: product.name },
  })
  .from(license)
  .leftJoin(product, eq(license.productId, product.id))
  .where(eq(license.organizationId, orgId))
  .orderBy(desc(license.createdAt));
```

**Key Rule**: Use object/callback syntax for `db.query.*`. Use `eq()`/`and()` only for `db.select()`/`db.insert()`/`db.update()`/`db.delete()`.

---

## Server Functions

### Basic Pattern

```typescript
import { createServerFn } from "@tanstack/react-start";
import authMiddleware from "@/middleware/auth";

export const myFunction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { field: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    // Server-side logic with authenticated user and org context
  });
```

### Calling from Components

```typescript
import { useServerFn } from "@tanstack/react-start";

function MyComponent() {
  const submit = useServerFn(myFunction);

  const handleClick = async () => {
    const result = await submit({ data: { field: "value" } });
  };
}
```

---

## Observability & Logging

### Structured Logger

All logging should use the structured logger (`@/lib/logger`) instead of `console.log`:

```typescript
import { logger } from "@/lib/logger";

// Basic logging with levels
logger.debug("Processing started", { fn: "myFunction" });
logger.info("Operation completed", { ms: 123, result: "success" });
logger.warn("Rate limit approaching", { current: 95, limit: 100 });
logger.error("Operation failed", { err: "Connection timeout" });

// Log exceptions with stack traces
try {
  await riskyOperation();
} catch (error) {
  logger.exception("Operation failed", error, { context: "myFunction" });
}

// Create child logger with preset context
const log = logger.child({ fn: "createLicense", org: orgId });
log.info("Creating license");  // Automatically includes fn and org
```

### Log Context Fields

Standard context fields (automatically injected from trace context):
- `traceId`: Request correlation ID (auto-injected)
- `org`: Organization ID (first 8 chars, auto-injected)
- `user`: User ID (first 8 chars, auto-injected)
- `fn`: Function/operation name
- `ms`: Duration in milliseconds
- `err`: Error message

### Trace Context

Requests are automatically wrapped with trace context for correlation:

```typescript
import { runWithTrace, getTraceId, updateTraceContext } from "@/lib/trace-context";

// Manually wrap operations (webhooks do this automatically)
return runWithTrace(
  { traceId: generateTraceId(), method: "POST", path: "/api/webhook" },
  async () => {
    // All logs within this callback share the same traceId
    logger.info("Processing webhook");
    await processEvent();
    logger.info("Webhook complete");
  }
);

// Update trace context with user/org info (auth middleware does this)
updateTraceContext({ userId, organizationId });
```

### Wide Event Middleware

Server functions use wide-event middleware for automatic instrumentation:

```typescript
import { wideEventMiddleware } from "@/middleware/wide-event";

export const myFunction = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("domain.action")])
  .handler(async ({ data, context: { organizationId, event } }) => {
    event.set("item.id", data.id); // Emits one event with duration + status
  });
```

### Log Naming Convention

Use hierarchical names with colons for log messages:

```typescript
// Webhooks
logger.info("webhook:license:created", { key, product });
logger.warn("webhook:refund:detected", { licenseId, amount });
logger.error("webhook:error", { eventType });

// Billing
logger.info("billing:subscription:updated", { tier, status });
logger.warn("billing:payment:failed", { invoiceId });

// General pattern: domain:entity:action
```

### Environment Configuration

```bash
# Log level filter (default: debug)
LOG_LEVEL=info           # debug|info|warn|error

# Output format (auto-detected based on NODE_ENV)
LOG_FORMAT=json          # json|pretty

```

### Wide Events (Canonical Log Lines)

For complex operations (webhooks, multi-step processes), use wide events instead of multiple log statements:

```typescript
import { createWideEvent, withWideEvent } from "@/lib/wide-event";

// Manual control
const event = createWideEvent("webhook.payment");
event.set("org", { id: orgId, tier: "pro" });
event.set("product.action", "created");
event.set("license.key", licenseKey);
event.success();  // or event.error(err)

// Auto-emit on completion
await withWideEvent("api.license.validate", async (event) => {
  event.set("license.id", licenseId);
  event.set("activation.machine_id", machineId);
  // Auto-emits success or error when function completes
  return result;
});
```

**Output (single event with full context):**
```json
{
  "event": "webhook.payment",
  "trace_id": "abc123",
  "duration_ms": 234,
  "org": { "id": "org-xxx", "tier": "pro" },
  "product": { "action": "created", "id": "prod-xxx" },
  "license": { "key": "XXXX-XXXX", "expires_days": 365 },
  "status": "success"
}
```

**When to use wide events vs regular logging:**
- **Wide events**: Webhooks, API requests, multi-step operations
- **Regular logger**: Single operations, background tasks, debugging

See `src/lib/wide-event.example.ts` for full patterns.

### Audit Trail

License operations are logged to the database for compliance:

```typescript
import { logLicenseEvent, createStatusChangeData } from "@/lib/audit";

await logLicenseEvent({
  licenseId,
  organizationId,
  type: "license.status_changed",
  actorType: "user",        // user|api|system|customer
  actorId: userId,
  data: createStatusChangeData({
    previousStatus: "active",
    newStatus: "suspended",
    reason: "Payment dispute",
  }),
  ipAddress: request.ip,
  userAgent: request.headers.get("user-agent"),
});
```

---

## Routing Patterns

### Route Guards (Protected Routes)

The `_auth/route.tsx` implements the auth guard pattern:

```typescript
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    // Check onboarding status
    if (!session.currentOrganization?.isOnboarded) {
      if (!location.pathname.startsWith("/onboarding")) {
        throw redirect({ to: "/onboarding" });
      }
    }

    return {
      user: session.user,
      organization: session.currentOrganization,
    };
  },
  component: AuthLayout,
});
```

### API Routes (Webhooks)

```typescript
export const Route = createFileRoute("/api/hooks/$organizationId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { organizationId } = params;
        const payload = await request.text();
        const signature = request.headers.get("stripe-signature");

        // Verify signature and process webhook
        try {
          const event = Stripe.webhooks.constructEvent(
            payload,
            signature,
            webhookSecret
          );
          // Handle event...
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Webhook Error" }), {
            status: 400,
          });
        }
      },
    },
  },
});
```

### Loaders

```typescript
export const Route = createFileRoute("/_auth/licenses/")({
  component: LicensesPage,
  loader: async () => {
    const licenses = await getLicenses();
    return { licenses };
  },
});

function LicensesPage() {
  const { licenses } = Route.useLoaderData();
  // ...
}
```

---

## Forms Pattern

Use TanStack Form with server functions:

### Required Imports

```typescript
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
```

### FieldInfo Component

```typescript
function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid && (
        <p className="text-sm text-destructive mt-1">
          {field.state.meta.errors.join(", ")}
        </p>
      )}
    </>
  );
}
```

### Form Component Pattern

```typescript
function CreateLicenseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const submit = useServerFn(createLicense);

  const form = useForm({
    defaultValues: { productId: "", customerId: "", expiresAt: "" },
    onSubmit: async ({ value }) => {
      const result = await submit({ data: value });
      if (result) {
        setOpen(false);
        form.reset();
        router.invalidate(); // Refresh loader data
      }
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field
        name="productId"
        validators={{
          onChange: ({ value }) => !value ? "Required" : undefined,
        }}
      >
        {(field) => (
          <>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldInfo field={field} />
          </>
        )}
      </form.Field>
      {/* ... */}
    </form>
  );
}
```

**Key practices**:
1. Use `useServerFn` hook for server function calls
2. Validate on change with `onChange` validators
3. Call `router.invalidate()` after success to refresh loader data
4. Reset form and close dialog on success

---

## Multi-Tenancy Patterns

### Organization Context

All resources include `organizationId` for proper scoping:

```typescript
// Schema
export const license = sqliteTable("license", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  // ...
});

// Server function with org scoping
export const getLicenses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId } }) => {
    return db.select()
      .from(license)
      .where(eq(license.organizationId, organizationId));
  });
```

The auth middleware provides `organizationId` in the context from the user's current organization.

---

## UI Patterns

### Page Layout

All pages under `_auth/` use the `PageLayout` component:

```typescript
import { PageLayout } from "@/components/page-layout";

function RouteComponent() {
  return (
    <PageLayout title="Licenses">
      {/* Page content */}
    </PageLayout>
  );
}
```

### Toast Notifications (Sonner)

```typescript
import { toast } from "sonner";

toast.success("License created!");
toast.error("Failed to create license");
```

---

## Domain Model

### Core Entities

- **Organization**: Multi-tenant container with Stripe integration
- **Membership**: User <-> Organization relationship with roles (owner, admin, member)
- **Product**: Software product that can have licenses
- **Customer**: End-user who purchases licenses
- **License**: Key with status, expiration, and activation limits
- **Activation**: Device/machine activated against a license
- **LicensePolicy**: Template for license terms (perpetual, subscription, trial)
- **SecretKey**: API authentication for programmatic access

### License Workflow

1. Customer purchases product via Stripe
2. Webhook creates license with generated key (XXXX-XXXX-XXXX-XXXX)
3. Customer activates license on device (respects activation limit)
4. License can be suspended/revoked by admin

---

## Environment Variables

```bash
# Database (SQLite file path, or libsql:// URL + DATABASE_AUTH_TOKEN)
DATABASE_URL=sqlite.db

# Auth
BETTER_AUTH_SECRET=your-secret-key

# Stripe (per-organization, stored in DB)
# Organizations store their own stripeApiKey and stripeWebhookSecret
```

---

## Local Database Access

Connect to local SQLite:

```bash
# Using sqlite3 CLI
sqlite3 sqlite.db

# Common queries
sqlite3 sqlite.db "SELECT * FROM user;"
sqlite3 sqlite.db "SELECT * FROM organization;"

# Update user email verification
sqlite3 sqlite.db "UPDATE user SET email_verified = 1 WHERE email = 'user@example.com';"
```

**Note**: Table/column names use snake_case in the database (e.g., `email_verified`, not `emailVerified`). SQLite stores booleans as integers (0/1).

---

## Database Changes

1. Update `src/lib/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`
