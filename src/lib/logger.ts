/**
 * Structured Logger with Trace Context
 *
 * Features:
 * - Automatic trace ID injection from AsyncLocalStorage
 * - Environment-aware formatting (JSON for production, pretty for dev)
 * - Sensitive data redaction
 * - Performance timing helpers
 *
 * Production: JSON (structured, for log aggregation)
 * Development: Human-readable with colors
 *
 * Override with LOG_FORMAT=json|pretty
 * Set LOG_LEVEL=debug|info|warn|error to filter output
 */

import { getTraceContext, getTraceDuration } from "./trace-context";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

// Log level filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || "debug";
const minLevel = LOG_LEVELS[configuredLevel] ?? 0;

const isDev = process.env.NODE_ENV !== "production";
const forceFormat = process.env.LOG_FORMAT as "json" | "pretty" | undefined;
const useJson = forceFormat === "json" || (!forceFormat && !isDev);

// ANSI colors for dev output
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  // Levels
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  // Content
  time: "\x1b[90m", // gray
  fn: "\x1b[35m", // magenta
  ctx: "\x1b[90m", // gray
};

const levelSymbols: Record<LogLevel, string> = {
  debug: "→",
  info: "✓",
  warn: "⚠",
  error: "✗",
};

function getTimestamp(): string {
  const now = new Date();
  if (useJson) {
    return now.toISOString();
  }
  // Dev: just time (HH:MM:SS.mmm)
  return now.toTimeString().slice(0, 8) + "." + String(now.getMilliseconds()).padStart(3, "0");
}

function formatContextPretty(ctx: LogContext): string {
  const parts: string[] = [];

  // Trace ID (short form for readability)
  if (ctx.traceId) {
    const shortTrace = String(ctx.traceId).slice(0, 8);
    parts.push(`${colors.dim}[${shortTrace}]${colors.reset}`);
  }

  // Function name (highlighted)
  if (ctx.fn) {
    parts.push(`${colors.fn}${ctx.fn}${colors.reset}`);
  }

  // Context info in brackets
  const ctxParts: string[] = [];
  if (ctx.org) ctxParts.push(`org:${ctx.org}`);
  if (ctx.user) ctxParts.push(`user:${ctx.user}`);
  if (ctxParts.length > 0) {
    parts.push(`${colors.ctx}[${ctxParts.join(" ")}]${colors.reset}`);
  }

  // Duration
  if (ctx.ms !== undefined) {
    const ms = ctx.ms as number;
    const color = ms > 1000 ? colors.warn : ms > 500 ? colors.dim : "";
    parts.push(`${color}${ms}ms${colors.reset}`);
  }

  // Error message
  if (ctx.err) {
    parts.push(`${colors.error}${ctx.err}${colors.reset}`);
  }

  // Stack trace (abbreviated)
  if (ctx.stack) {
    const stackLines = String(ctx.stack).split("\n").slice(0, 3);
    parts.push(`\n${colors.dim}${stackLines.join("\n")}${colors.reset}`);
  }

  // Input data (compact)
  if (ctx.input) {
    const inputStr = JSON.stringify(ctx.input);
    const truncated = inputStr.length > 80 ? inputStr.slice(0, 80) + "..." : inputStr;
    parts.push(`${colors.dim}${truncated}${colors.reset}`);
  }

  return parts.join(" ");
}

function formatJson(level: LogLevel, message: string, context?: LogContext): string {
  return JSON.stringify({
    ts: getTimestamp(),
    level,
    msg: message,
    ...context,
  });
}

function formatPretty(level: LogLevel, message: string, context?: LogContext): string {
  const time = `${colors.time}${getTimestamp()}${colors.reset}`;
  const levelColor = colors[level];
  const symbol = `${levelColor}${levelSymbols[level]}${colors.reset}`;
  const levelStr = `${levelColor}${level.toUpperCase().padEnd(5)}${colors.reset}`;

  let line = `${time} ${levelStr} ${symbol}`;

  if (context && Object.keys(context).length > 0) {
    line += ` ${formatContextPretty(context)}`;
  } else if (message) {
    line += ` ${message}`;
  }

  return line;
}

/**
 * Inject trace context into log context automatically
 */
function injectTraceContext(context?: LogContext): LogContext {
  const traceCtx = getTraceContext();
  if (!traceCtx) return context || {};

  return {
    traceId: traceCtx.traceId,
    ...(traceCtx.organizationId && { org: traceCtx.organizationId.slice(0, 8) }),
    ...(traceCtx.userId && { user: traceCtx.userId.slice(0, 8) }),
    ...context,
  };
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  // Check log level filter
  if (LOG_LEVELS[level] < minLevel) return;

  // Inject trace context
  const enrichedContext = injectTraceContext(context);

  const formatted = useJson
    ? formatJson(level, message, enrichedContext)
    : formatPretty(level, message, enrichedContext);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),

  /**
   * Log an error with stack trace
   */
  exception: (message: string, error: unknown, context?: LogContext) => {
    const err = error instanceof Error ? error : new Error(String(error));
    log("error", message, {
      ...context,
      err: err.message,
      stack: err.stack,
    });
  },

  /**
   * Create a child logger with preset context
   * Useful for scoping logs to a specific operation
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log("info", message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log("warn", message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) =>
      log("error", message, { ...baseContext, ...context }),
    exception: (message: string, error: unknown, context?: LogContext) => {
      const err = error instanceof Error ? error : new Error(String(error));
      log("error", message, {
        ...baseContext,
        ...context,
        err: err.message,
        stack: err.stack,
      });
    },
  }),

  /**
   * Get current trace duration (ms since request started)
   */
  getTraceDuration,
};
