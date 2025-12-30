# Full-Stack TypeScript Best Practices

App-agnostic guidelines and patterns for building full-stack applications with TanStack Start, Drizzle ORM, and shadcn/ui.

---

## Project Structure

Organize code by domain and responsibility:

```
src/
├── routes/                    # File-based routing
│   ├── __root.tsx            # Root layout (providers, toaster)
│   ├── _auth/                # Protected routes (auth required)
│   │   ├── route.tsx         # Auth layout with beforeLoad guard
│   │   └── [domain]/         # Domain-specific routes
│   ├── api/                  # API endpoints
│   └── login.tsx             # Public routes
├── functions/                # Server functions by domain
│   ├── auth.ts
│   ├── [domain].ts
│   └── ...
├── lib/
│   ├── db/
│   │   ├── db.ts             # Database connection (DO NOT MODIFY)
│   │   └── schema.ts         # Drizzle schema + relations
│   ├── [domain]/             # Domain-specific utilities
│   └── [integration].ts      # Third-party integrations
├── trigger/                  # Background tasks (Trigger.dev)
└── components/
    ├── ui/                   # shadcn/ui primitives
    └── [domain]/             # Domain-specific components
```

### Path Aliases

Always use path aliases for cleaner imports:

```typescript
import db from "@/lib/db/db";
import { auth } from "@/lib/auth";
import { processTask } from "@/trigger/process-task";
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
  status: text("status", { enum: ["pending", "completed", "failed"] }),

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
      user: r.one.user({
        from: r.memberships.userId,
        to: r.user.id,
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

const membership = await db.query.memberships.findFirst({
  where: { organizationId: orgId, userId: userId },
});

// WRONG - v1 function syntax (causes "decoder" error)
const org = await db.query.organizations.findFirst({
  where: eq(organizations.slug, "my-org"),  // DON'T DO THIS
});
```

#### Complex Conditions

For operators beyond equality (gt, lt, isNull, etc.), use callback syntax:

```typescript
const pending = await db.query.invitations.findMany({
  where: (fields, { and, eq, gt, isNull }) =>
    and(
      eq(fields.organizationId, orgId),
      gt(fields.expiresAt, new Date()),
      isNull(fields.acceptedAt)
    ),
});

// Dynamic conditions
const results = await db.query.items.findMany({
  where: (fields, { and, or, eq }) => {
    const conditions = [
      eq(fields.organizationId, orgId),
      or(eq(fields.visibility, "team"), eq(fields.userId, userId))
    ];
    if (filter) conditions.push(eq(fields.type, filter));
    return and(...conditions);
  },
});
```

#### With Relations

```typescript
const item = await db.query.items.findFirst({
  where: { id: itemId },
  with: {
    children: true,
    parent: true,
  },
});
```

#### Regular Query Builder

The regular query builder still uses `eq()`, `and()` from `drizzle-orm`:

```typescript
import { eq, and } from "drizzle-orm";

// Regular query builder - NOT db.query
await db.update(items)
  .set({ status: "completed" })
  .where(eq(items.id, itemId));

await db.delete(items)
  .where(and(
    eq(items.id, itemId),
    eq(items.organizationId, orgId)
  ));
```

**Key Rule**: Use object/callback syntax for `db.query.*`. Use `eq()`/`and()` only for `db.select()`/`db.insert()`/`db.update()`/`db.delete()`.

### Atomic Operations (UPSERT)

```typescript
await db.insert(usage)
  .values({ organizationId, period, count: 1 })
  .onConflictDoUpdate({
    target: [usage.organizationId, usage.period],
    set: {
      count: sql`${usage.count} + 1`,
      updatedAt: new Date()
    },
    where: sql`${usage.count} < ${limit}`
  });
```

---

## Server Functions

### Basic Pattern

```typescript
import { createServerFn } from "@tanstack/react-start";

export const myFunction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { field: string }) => data)
  .handler(async ({ data, context: { session: { user } } }) => {
    // Server-side logic with authenticated user
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

```typescript
export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    return { user: session.user };
  },
  component: AuthLayout,
});
```

### API Routes

```typescript
export const Route = createFileRoute("/api/webhooks/$integrationId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { integrationId } = params;
        const body = await request.text();

        // Verify signature
        const signature = request.headers.get("X-Webhook-Signature");
        if (!verifySignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // Process
        await processWebhook(integrationId, JSON.parse(body));

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
```

### Loaders

```typescript
export const Route = createFileRoute("/_auth/$orgSlug/items/")({
  component: ItemsPage,
  loader: async ({ params }) => {
    const items = await getItems({ orgSlug: params.orgSlug });
    return { items };
  },
});

function ItemsPage() {
  const { items } = Route.useLoaderData();
  // ...
}
```

---

## Forms Pattern

Use TanStack Form with server functions:

```typescript
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";

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

function CreateItemForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const submit = useServerFn(createItem);

  const form = useForm({
    defaultValues: { name: "", description: "" },
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            value.length < 2 ? "Name must be at least 2 characters" : undefined,
        }}
      >
        {(field) => (
          <>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
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

## UI Patterns

### Page Layout

```typescript
import { PageLayout } from "@/components/page-layout";

function RouteComponent() {
  return (
    <PageLayout title="Page Title">
      {/* Page content */}
    </PageLayout>
  );
}
```

### Toast Notifications (Sonner)

Mount `<Toaster />` in `__root.tsx`, then use anywhere:

```typescript
import { toast } from "sonner";

// Success
toast.success("Saved!", { description: "Your changes have been saved." });

// Error
toast.error("Failed", { description: "Please try again." });

// Info/Warning
toast.info("Heads up");
toast.warning("Careful!");

// With action
toast("Event created", {
  action: {
    label: "Undo",
    onClick: () => console.log("Undo"),
  },
});
```

### Keyboard Shortcuts

Document and implement consistent shortcuts for power users:

```typescript
// Example: Review queue shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key.toLowerCase()) {
      case "a": approve(); break;
      case "e": edit(); break;
      case "s": skip(); break;
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

---

## Background Jobs (Trigger.dev)

### Task Definition

```typescript
import { task } from "@trigger.dev/sdk/v3";

export const processItem = task({
  id: "process-item",
  retry: {
    maxAttempts: 3,
    minDelayMs: 30000,
    maxDelayMs: 120000,
  },
  run: async (payload: { itemId: string }) => {
    // 1. Fetch from database
    // 2. Process
    // 3. Save results
    // 4. Trigger downstream events
  },
});
```

### Triggering Tasks

```typescript
import { tasks } from "@trigger.dev/sdk/v3";
import type { processItem } from "@/trigger/process-item";

// Trigger and wait for result
const result = await tasks.triggerAndWait<typeof processItem>(
  "process-item",
  { itemId: item.id }
);

// Fire and forget
await tasks.trigger<typeof processItem>(
  "process-item",
  { itemId: item.id }
);
```

### Fan-Out Pattern (Batch Processing)

```typescript
export const processBatch = task({
  id: "process-batch",
  run: async (payload: { batchId: string }) => {
    const items = await getBatchItems(batchId);

    // Trigger all in parallel
    const handles = await Promise.all(
      items.map(item =>
        tasks.trigger("process-item", { itemId: item.id })
      )
    );

    // Wait for all to complete
    const results = await Promise.all(
      handles.map(handle => handle.wait())
    );

    // Update batch status
    await updateBatchStatus(batchId, results);
  },
});
```

---

## Multi-Tenancy Patterns

### Organization Context

All resources should include `organizationId` for proper scoping:

```typescript
// Schema
export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),
  visibility: text("visibility", { enum: ["private", "team"] }).default("private"),
  // ...
});

// Query with org scoping
const items = await db.query.items.findMany({
  where: (fields, { and, or, eq }) =>
    and(
      eq(fields.organizationId, orgId),
      or(
        eq(fields.visibility, "team"),
        eq(fields.userId, userId)
      )
    ),
});
```

### URL Structure

Use org slug in URLs for clear context:

```
/$orgSlug/dashboard
/$orgSlug/items
/$orgSlug/items/$itemId
/$orgSlug/settings
```

---

## Webhook Patterns

### HMAC Signature Verification

```typescript
import crypto from "crypto";

function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  return hmac.digest("hex");
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}

// Headers to send with webhooks
const headers = {
  "Content-Type": "application/json",
  "X-Webhook-Signature": `sha256=${signature}`,
  "X-Webhook-Timestamp": Date.now().toString(),
  "X-Event-Type": eventType,
};
```

### Idempotency for Incoming Webhooks

```typescript
// Track processed events to prevent duplicates
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(), // External event ID
  processedAt: integer("processed_at", { mode: "timestamp_ms" }),
});

async function handleWebhook(eventId: string, handler: () => Promise<void>) {
  const existing = await db.query.webhookEvents.findFirst({
    where: { id: eventId },
  });

  if (existing) return; // Already processed

  await handler();

  await db.insert(webhookEvents).values({
    id: eventId,
    processedAt: new Date(),
  });
}
```

---

## Subscription & Usage Patterns

### Plan Definitions

```typescript
export const PLANS = {
  free: {
    operationsPerMonth: 50,
    maxResources: 5,
    features: { advancedFeature: false, scheduling: false },
  },
  pro: {
    operationsPerMonth: 10_000,
    maxResources: null, // unlimited
    features: { advancedFeature: true, scheduling: true },
  },
} as const;
```

### Usage Tracking

```typescript
// Usage table with unique constraint on (orgId, period)
export const usage = sqliteTable("usage", {
  organizationId: text("organization_id").notNull(),
  period: text("period").notNull(), // YYYY-MM format
  count: integer("count").default(0),
});

// Atomic increment with limit check
async function useOperation(orgId: string, limit: number): Promise<boolean> {
  const period = new Date().toISOString().slice(0, 7);

  const result = await db.insert(usage)
    .values({ organizationId: orgId, period, count: 1 })
    .onConflictDoUpdate({
      target: [usage.organizationId, usage.period],
      set: { count: sql`${usage.count} + 1` },
      where: sql`${usage.count} < ${limit}`,
    })
    .returning();

  return result.length > 0;
}
```

### Feature Gates

```typescript
function canUseFeature(plan: "free" | "pro", feature: keyof typeof PLANS.free.features): boolean {
  return PLANS[plan].features[feature];
}

// In server function
if (!canUseFeature(subscription.plan, "advancedFeature")) {
  throw new Error("Upgrade to Pro to use this feature");
}
```

---

## Retry & Error Handling

### Exponential Backoff

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [0, 30_000, 120_000], // immediate, 30s, 2min
};

async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(RETRY_CONFIG.delays[attempt]);
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;
      onRetry?.(attempt, lastError);
    }
  }

  throw lastError!;
}
```

### Confidence-Based Review Flagging

For AI/LLM outputs, flag low-confidence results for human review:

```typescript
interface ConfidenceThresholds {
  autoApprove: number;  // >= 0.8: auto-approved
  review: number;       // 0.5 - 0.79: needs review
  // < 0.5: requires review
}

function shouldFlagForReview(scores: Record<string, number>): boolean {
  return Object.values(scores).some(score => score < 0.8);
}
```

---

## Change Detection

For monitoring/scheduling features, detect changes between runs:

```typescript
interface FieldChange {
  field: string;
  previousValue: unknown;
  currentValue: unknown;
  changeType: "added" | "removed" | "modified";
}

function detectChanges(previous: Record<string, unknown>, current: Record<string, unknown>): {
  hasChanges: boolean;
  changes: FieldChange[];
} {
  const changes: FieldChange[] = [];
  const allFields = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const field of allFields) {
    const prevValue = previous[field];
    const currValue = current[field];

    if (!deepEqual(prevValue, currValue)) {
      changes.push({
        field,
        previousValue: prevValue,
        currentValue: currValue,
        changeType: prevValue === undefined ? "added"
                  : currValue === undefined ? "removed"
                  : "modified",
      });
    }
  }

  return { hasChanges: changes.length > 0, changes };
}
```

---

## Environment Variables Pattern

Organize by category:

```bash
# Database
DATABASE_URL=file:sqlite.db

# Auth
BETTER_AUTH_SECRET=your-secret-key

# Payments (if applicable)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# External APIs
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# File Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...

# Background Jobs
TRIGGER_SECRET_KEY=...

# App Config
APP_URL=https://yourdomain.com
```

---

## Development Workflow

### Database Changes

1. Update `src/lib/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`

### Common Commands

```bash
bun install                 # Install dependencies
bun --bun run dev           # Start dev server
bun --bun run build         # Build for production
bun --bun run test          # Run tests

bun run db:generate         # Generate migrations
bun run db:migrate          # Apply migrations
bun run db:seed             # Seed data

bunx trigger@latest dev     # Start Trigger.dev dev server
bunx trigger@latest deploy  # Deploy tasks to cloud
```
