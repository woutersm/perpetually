import { createMiddleware } from "@tanstack/react-start";
import {
  runWithTrace,
  generateTraceId,
} from "@/lib/trace-context";

/**
 * Global tracing middleware for HTTP requests.
 *
 * Wraps all requests in a trace context that:
 * - Generates a unique traceId for request correlation
 * - Logs request start/end with timing
 * - Propagates trace context through AsyncLocalStorage
 * - Captures HTTP metadata (method, path, status)
 *
 * This middleware should be used as a request-level middleware
 * via createStart() configuration.
 */
export const tracingMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Check for incoming trace ID (for distributed tracing)
    const incomingTraceId =
      request.headers.get("x-trace-id") ||
      request.headers.get("traceparent")?.split("-")[1];

    const traceId = incomingTraceId || generateTraceId();

    return runWithTrace(
      {
        traceId,
        method,
        path,
        startTime: Date.now(),
      },
      async () => {
        return next();
      }
    );
  }
);

export default tracingMiddleware;
