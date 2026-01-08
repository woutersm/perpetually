import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Trace context for request correlation across async operations.
 *
 * Provides a traceId that propagates through the entire request lifecycle,
 * enabling log correlation and distributed tracing.
 */

export interface TraceContext {
  /** Unique identifier for this request/trace */
  traceId: string;
  /** Optional span ID for nested operations */
  spanId?: string;
  /** Request start time for duration calculation */
  startTime: number;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request path */
  path?: string;
  /** Organization ID if available */
  organizationId?: string;
  /** User ID if available */
  userId?: string;
}

// AsyncLocalStorage for propagating trace context through async operations
const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Generate a short, URL-safe trace ID
 * Format: 16 character hex string (64-bit)
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a span ID for child operations
 * Format: 8 character hex string (32-bit)
 */
export function generateSpanId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get the current trace context
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Get the current trace ID (or undefined if not in a traced context)
 */
export function getTraceId(): string | undefined {
  return traceStorage.getStore()?.traceId;
}

/**
 * Run a function with a new trace context
 */
export function runWithTrace<T>(
  context: Partial<TraceContext> & { traceId?: string },
  fn: () => T
): T {
  const fullContext: TraceContext = {
    traceId: context.traceId || generateTraceId(),
    startTime: context.startTime ?? Date.now(),
    ...context,
  };
  return traceStorage.run(fullContext, fn);
}

/**
 * Update the current trace context with additional data
 * (e.g., after auth middleware adds user/org IDs)
 */
export function updateTraceContext(updates: Partial<TraceContext>): void {
  const current = traceStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}

/**
 * Calculate duration from trace start
 */
export function getTraceDuration(): number | undefined {
  const ctx = traceStorage.getStore();
  if (!ctx) return undefined;
  return Date.now() - ctx.startTime;
}
