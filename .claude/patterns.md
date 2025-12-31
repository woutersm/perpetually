# Application Patterns Blueprint

## Auth Setup

Using **better-auth** with Drizzle adapter and TanStack Start cookies integration.

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true },
  plugins: [tanstackStartCookies()],
});

export const authClient = createAuthClient({});
```

## Server Functions

All server functions live in `src/functions/` and use `createServerFn` from @tanstack/react-start.

### Session Server Function

```typescript
// src/functions/sessions.ts
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    return session;
  }
);
```

### Data Server Function with Middleware

```typescript
// src/functions/runs.ts
import { createServerFn } from "@tanstack/react-start";
import db from "@/lib/db/db";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "@tanstack/react-router";
import authMiddleware from "@/middleware/auth";

export const loadRuns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { session: { user } } }) => {
    const userRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.userId, user.id));

    if (!userRuns) {
      throw notFound();
    }

    return userRuns;
  });
```

### Auth Middleware

```typescript
// src/middleware/auth.ts
import { getSessionFn } from "@/functions/sessions";
import { createMiddleware } from "@tanstack/react-start";

const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    return next({ context: { session } });
  }
);

export default authMiddleware;
```

**Pattern**: Use `.middleware([authMiddleware])` to inject session into handler context. Handler receives `{ context: { session: { user } } }`.

## Route Protection & Loaders

Auth is handled **once** at the layout route level. Child routes inherit the context and only need loaders.

### Layout Route (Auth Gate)

```typescript
// src/routes/_auth/route.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSessionFn } from "@/functions/sessions";

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

function AuthLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <Outlet />
    </SidebarProvider>
  );
}
```

### Child Route (Inherits Context)

```typescript
// src/routes/_auth/runs/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { loadRuns } from "../../../functions/runs";

export const Route = createFileRoute("/_auth/runs/")({
  component: RouteComponent,
  loader: () => loadRuns(), // Server function handles session via middleware
});

function RouteComponent() {
  const runs = Route.useLoaderData();

  return <div>{/* Use runs data */}</div>;
}
```

**Pattern**:
1. **Layout route** → `beforeLoad` checks auth, redirects if unauthorized, returns `{ user }` in context
2. **Child routes** → Only need `loader`, receive `context.user` from parent
3. Component → Access data via `Route.useLoaderData()`


## File Structure

```
src/
├── functions/          # Server functions
│   ├── sessions.ts    # Session management
│   └── [feature].ts   # Feature-specific server functions
├── lib/
│   ├── auth.ts        # better-auth configuration
│   └── db/            # Database setup & schema
├── routes/
│   └── _auth/         # Protected routes (layout route)
│       ├── route.tsx  # Auth gate + layout (beforeLoad here)
│       └── [page]/    # Child pages (inherit context.user)
```

## Summary

1. **Server Functions**: Create in `src/functions/` with `.middleware([authMiddleware])` + `.handler()`
2. **Auth Middleware**: Reusable middleware injects session into server function context
3. **Auth Gate**: Handle once in `_auth/route.tsx` `beforeLoad` → returns `{ user }` in context
4. **Child Routes**: Inherit `context.user` from layout, use `loader: () => serverFn()`
5. **Data Loading**: Server functions handle their own auth via middleware
6. **No Repeated Auth Checks**: All routes under `_auth/` are automatically protected
