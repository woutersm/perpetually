# Server Functions Cannot Be Called Directly from API Routes

## Problem

In TanStack Start production builds, calling a `createServerFn` function directly from an API route handler causes:

```
error: Server function info not found for <hash>
```

## Cause

Server functions are designed for client-to-server RPC invocation. They rely on a manifest that maps function hashes to their implementations. When called directly from server-side code (like an API route), the RPC context isn't set up, so the manifest lookup fails.

## Solution

Extract the business logic into a regular async function that can be called from anywhere:

1. **Regular function** - Contains the actual logic, callable from API routes or other server code
2. **Server function wrapper** (optional) - Wraps the regular function for client-side use via `useServerFn`

## Pattern

```typescript
// src/functions/example.ts

// Regular function - can be called from API routes or server functions
export async function doSomething(userId: string) {
  // Business logic here
  return { success: true };
}

// Server function wrapper - for client-side invocation only
export const doSomethingFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context: { session: { user } } }) => {
    return doSomething(user.id);
  });
```

```typescript
// src/routes/api/example.ts
import { doSomething } from "@/functions/example";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/example")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Handle auth directly in API route
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Call the regular function, not the server function
        const result = await doSomething(session.user.id);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
```

## Key Takeaways

- `createServerFn` functions are for **client-side invocation only** (via `useServerFn` hook)
- API routes should call **regular async functions** directly
- API routes must handle authentication themselves via `auth.api.getSession()`
- This issue only manifests in **production builds**, not during development
