import { createStart } from "@tanstack/react-start";
import { tracingMiddleware } from "@/middleware/tracing";

/**
 * TanStack Start configuration with global observability middleware.
 *
 * This configures request-level middleware that runs before any routes
 * or server functions, enabling:
 * - Request tracing with correlation IDs
 * - HTTP request/response logging
 * - Performance timing
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [tracingMiddleware],
}));

export default startInstance;
