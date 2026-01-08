/**
 * Wide Events / Canonical Log Lines
 *
 * Instead of emitting many small log statements throughout a request,
 * accumulate context and emit ONE rich event at the end.
 *
 * Benefits:
 * - Single query gets everything about a request
 * - Enables aggregation: "How many licenses created today by tier?"
 * - Filter by business dimensions: "Errors for pro tier orgs"
 * - No manual correlation across log lines
 *
 * @see https://loggingsucks.com/
 *
 * Usage:
 * ```typescript
 * const event = createWideEvent("webhook.processed");
 *
 * event.set("org", { id: orgId, tier: "pro" });
 * event.set("stripe.event_type", "payment_intent.succeeded");
 *
 * // Nested paths work
 * event.set("product.action", "created");
 * event.set("product.id", productId);
 *
 * // At the end (or in finally block)
 * event.success();  // or event.error(err)
 * ```
 */

import { getTraceId } from "./trace-context";

type EventData = Record<string, unknown>;

export interface WideEvent {
  /** Set a field (supports dot notation for nesting) */
  set: (path: string, value: unknown) => WideEvent;

  /** Set multiple fields at once */
  setAll: (data: EventData) => WideEvent;

  /** Mark event as successful and emit */
  success: (extra?: EventData) => void;

  /** Mark event as failed and emit */
  error: (err: unknown, extra?: EventData) => void;

  /** Get current accumulated data (for inspection) */
  getData: () => EventData;
}

// Output modes
const isDev = process.env.NODE_ENV !== "production";
const forceFormat = process.env.LOG_FORMAT as "json" | "pretty" | undefined;
const useJson = forceFormat === "json" || (!forceFormat && !isDev);

// ANSI colors for pretty output
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

/**
 * Set a nested value using dot notation
 * e.g., set(obj, "product.action", "created") → { product: { action: "created" } }
 */
function setNestedValue(obj: EventData, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as EventData;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Format duration with color coding
 */
function formatDuration(ms: number): string {
  if (!isDev || useJson) return `${ms}ms`;

  if (ms > 1000) return `${colors.red}${ms}ms${colors.reset}`;
  if (ms > 500) return `${colors.yellow}${ms}ms${colors.reset}`;
  return `${colors.dim}${ms}ms${colors.reset}`;
}

/**
 * Pretty print a wide event for development
 */
function prettyPrint(
  eventName: string,
  data: EventData,
  status: "success" | "error",
  durationMs: number
): void {
  const timestamp = new Date().toTimeString().slice(0, 8);
  const statusIcon = status === "success" ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  const statusColor = status === "success" ? colors.green : colors.red;
  const traceId = data.trace_id ? `${colors.dim}[${String(data.trace_id).slice(0, 8)}]${colors.reset} ` : "";

  // Header line
  console.log(
    `${colors.dim}${timestamp}${colors.reset} ${statusIcon} ${traceId}${statusColor}${eventName}${colors.reset} ${formatDuration(durationMs)}`
  );

  // Print key fields in a compact format
  const skipFields = new Set(["event", "trace_id", "timestamp", "duration_ms", "status"]);

  for (const [key, value] of Object.entries(data)) {
    if (skipFields.has(key)) continue;

    if (typeof value === "object" && value !== null) {
      // Nested object - print on one line
      const nested = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${k}=${formatValue(v)}`)
        .join(" ");
      console.log(`  ${colors.cyan}${key}${colors.reset}: ${nested}`);
    } else {
      console.log(`  ${colors.cyan}${key}${colors.reset}: ${formatValue(value)}`);
    }
  }
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return `${colors.dim}null${colors.reset}`;
  if (typeof v === "boolean") return v ? `${colors.green}true${colors.reset}` : `${colors.dim}false${colors.reset}`;
  if (typeof v === "number") return `${colors.magenta}${v}${colors.reset}`;
  if (typeof v === "string") {
    // Truncate long strings
    const display = v.length > 50 ? v.slice(0, 50) + "..." : v;
    return display;
  }
  return String(v);
}

/**
 * Emit the wide event
 */
function emit(
  eventName: string,
  data: EventData,
  status: "success" | "error",
  startTime: number
): void {
  const durationMs = Date.now() - startTime;
  const traceId = getTraceId();

  const fullEvent: EventData = {
    event: eventName,
    ...(traceId && { trace_id: traceId }),
    timestamp: new Date().toISOString(),
    duration_ms: durationMs,
    ...data,
    status,
  };

  if (useJson) {
    console.log(JSON.stringify(fullEvent));
  } else {
    prettyPrint(eventName, fullEvent, status, durationMs);
  }
}

/**
 * Create a wide event builder
 *
 * @param eventName - The event name (e.g., "webhook.processed", "api.license.validate")
 */
export function createWideEvent(eventName: string): WideEvent {
  const startTime = Date.now();
  const data: EventData = {};

  const event: WideEvent = {
    set(path: string, value: unknown) {
      setNestedValue(data, path, value);
      return event;
    },

    setAll(newData: EventData) {
      Object.assign(data, newData);
      return event;
    },

    success(extra?: EventData) {
      if (extra) Object.assign(data, extra);
      emit(eventName, data, "success", startTime);
    },

    error(err: unknown, extra?: EventData) {
      if (extra) Object.assign(data, extra);

      // Extract error info
      if (err instanceof Error) {
        data.error = {
          message: err.message,
          name: err.name,
          ...(isDev && { stack: err.stack?.split("\n").slice(0, 3).join("\n") }),
        };
      } else {
        data.error = { message: String(err) };
      }

      emit(eventName, data, "error", startTime);
    },

    getData() {
      return { ...data };
    },
  };

  return event;
}

/**
 * Helper to create a wide event that auto-emits on scope exit
 *
 * Usage:
 * ```typescript
 * await withWideEvent("webhook.processed", async (event) => {
 *   event.set("org.id", orgId);
 *   // ... do work ...
 *   // Automatically emits success or error on exit
 * });
 * ```
 */
export async function withWideEvent<T>(
  eventName: string,
  fn: (event: WideEvent) => Promise<T>
): Promise<T> {
  const event = createWideEvent(eventName);

  try {
    const result = await fn(event);
    event.success();
    return result;
  } catch (err) {
    event.error(err);
    throw err;
  }
}
