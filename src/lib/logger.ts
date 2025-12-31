/**
 * Logger with environment-aware formatting
 *
 * Production: JSON (structured, for log aggregation)
 * Development: Human-readable with colors
 *
 * Override with LOG_FORMAT=json|pretty
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

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

  // Function name first (highlighted)
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

function log(level: LogLevel, message: string, context?: LogContext): void {
  const formatted = useJson
    ? formatJson(level, message, context)
    : formatPretty(level, message, context);

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
};
