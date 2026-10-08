import { createMiddleware } from "@tanstack/react-start";
import { createWideEvent, type WideEvent } from "@/lib/wide-event";
import { updateTraceContext } from "@/lib/trace-context";

/**
 * Wide Event Middleware for Server Functions
 *
 * Automatically creates a wide event for each server function call and:
 * - Captures function name, user/org context, input data
 * - Injects `event` into context for functions to add data
 * - Auto-emits success or error when function completes
 *
 * Usage:
 * ```typescript
 * export const createLicense = createServerFn({ method: "POST" })
 *   .middleware([authMiddleware, wideEventMiddleware("license.create")])
 *   .handler(async ({ data, context }) => {
 *     // Add business context to the event
 *     context.event.set("product.id", data.productId);
 *     context.event.set("customer.id", data.customerId);
 *
 *     const license = await db.insert(...);
 *
 *     context.event.set("license.id", license.id);
 *     context.event.set("license.key", license.key);
 *
 *     return license;
 *   });
 * ```
 *
 * Output:
 * ```json
 * {
 *   "event": "license.create",
 *   "trace_id": "abc123",
 *   "duration_ms": 45,
 *   "fn": "createLicense",
 *   "org": { "id": "org-xxx" },
 *   "user": { "id": "usr-xxx" },
 *   "input": { "productId": "...", "customerId": "..." },
 *   "product": { "id": "prod-xxx" },
 *   "customer": { "id": "cust-xxx" },
 *   "license": { "id": "lic-xxx", "key": "XXXX-XXXX" },
 *   "status": "success"
 * }
 * ```
 */

// Sensitive fields to redact from input
const SENSITIVE_FIELDS = new Set([
  "password",
  "apiKey",
  "stripeApiKey",
  "webhookSecret",
  "stripeWebhookSecret",
  "token",
  "secret",
  "key", // license keys in input should be redacted
]);

function sanitizeInput(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 100) {
      sanitized[key] = value.slice(0, 100) + "...";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Context type extension for wide events
export interface WideEventContext {
  event: WideEvent;
}

/**
 * Creates middleware that wraps server function in a wide event.
 *
 * @param eventName - The event name (e.g., "license.create", "customer.update")
 * @param options - Optional configuration
 */
export function wideEventMiddleware(
  eventName: string,
  options?: {
    /** Include sanitized input data in event (default: true) */
    includeInput?: boolean;
    /** Skip emitting for read-only operations (default: false) */
    skipEmit?: boolean;
  }
) {
  const { includeInput = true, skipEmit = false } = options ?? {};

  return createMiddleware({ type: "function" }).server(
    async ({ next, context, data }) => {
      const event = createWideEvent(eventName);

      // Extract auth context if available
      const ctx = context as unknown as Record<string, unknown> | undefined;
      const user = ctx?.user as { id?: string; email?: string } | undefined;
      const organizationId = ctx?.organizationId as string | undefined;

      // Update trace context with user/org (for nested logs)
      if (user?.id || organizationId) {
        updateTraceContext({
          userId: user?.id,
          organizationId,
        });
      }

      // Capture context
      if (organizationId) {
        event.set("org.id", organizationId);
      }
      if (user?.id) {
        event.set("user.id", user.id);
      }

      // Capture sanitized input
      if (includeInput && data && Object.keys(data).length > 0) {
        event.set("input", sanitizeInput(data));
      }

      try {
        // Inject event into context for handler to use (merged with upstream context)
        const result = await next({ context: { event } });

        if (!skipEmit) {
          event.success();
        }

        return result;
      } catch (error) {
        if (!skipEmit) {
          event.error(error);
        }
        throw error;
      }
    }
  );
}

export default wideEventMiddleware;
