import { createMiddleware } from "@tanstack/react-start";
import { logger } from "@/lib/logger";

// Functions to skip logging (too noisy)
const SKIP_LOGGING = new Set(["getSessionFn"]);

// Sensitive fields to redact from input data
const SENSITIVE_FIELDS = new Set([
  "password",
  "apiKey",
  "stripeApiKey",
  "webhookSecret",
  "stripeWebhookSecret",
  "token",
  "secret",
]);

function sanitizeData(data: unknown): unknown {
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

/**
 * Logging middleware for server functions.
 *
 * Logs:
 * - Function name, duration, user/org context
 * - Input data (sensitive fields redacted)
 * - Errors with messages
 *
 * Skips: getSessionFn (too frequent)
 *
 * Usage (place AFTER authMiddleware to capture user context):
 *   .middleware([authMiddleware, loggingMiddleware("createLicense")])
 */
export function loggingMiddleware(functionName: string) {
  return createMiddleware({ type: "function" }).server(
    async ({ next, context, data }) => {
      // Skip noisy functions
      if (SKIP_LOGGING.has(functionName)) {
        return next({ context });
      }

      const startTime = Date.now();

      // Extract context from auth middleware
      const ctx = context as any;
      const userId = ctx?.user?.id;
      const orgId = ctx?.organizationId;

      const logContext: Record<string, unknown> = {
        fn: functionName,
        ...(orgId && { org: orgId.slice(0, 8) }), // First 8 chars of org ID
        ...(userId && { user: userId.slice(0, 8) }), // First 8 chars of user ID
      };

      // Log input data if present (sanitized)
      if (data && Object.keys(data).length > 0) {
        logContext.input = sanitizeData(data);
      }

      logger.debug("request", logContext);

      try {
        const result = await next({ context });
        const duration = Date.now() - startTime;

        logger.info("completed", { ...logContext, ms: duration });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        logger.error("failed", { ...logContext, ms: duration, err: errorMessage });

        throw error;
      }
    }
  );
}

export default loggingMiddleware;
