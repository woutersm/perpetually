# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
bun install                 # Install dependencies
bun --bun run dev           # Start development server on port 3000
bun --bun run build         # Build for production
bun --bun run serve         # Preview production build
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
- **Database**: SQLite with Drizzle ORM v2
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
│   │   ├── db.ts             # Database connection (DO NOT MODIFY)
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

## Database Patterns (Drizzle ORM v2)

### Schema Definition

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Use text IDs with UUID generation
export const items = sqliteTable("items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Enums as text with options
  status: text("status", { enum: ["pending", "active", "archived"] }),

  // JSON columns with type safety
  data: text("data", { mode: "json" }).$type<MyType>(),

  // Timestamps as milliseconds
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
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
# Database
DATABASE_URL=file:sqlite.db

# Auth
BETTER_AUTH_SECRET=your-secret-key

# Stripe (per-organization, stored in DB)
# Organizations store their own stripeApiKey and stripeWebhookSecret
```

---

## Database Changes

1. Update `src/lib/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`
