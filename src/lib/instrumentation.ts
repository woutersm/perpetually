/**
 * OpenTelemetry Instrumentation Foundation
 *
 * This provides the infrastructure for distributed tracing. When enabled,
 * it will automatically instrument HTTP requests and database queries.
 *
 * To enable tracing:
 * 1. Install dependencies: bun add @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/sdk-trace-node
 * 2. Set OTEL_ENABLED=true and configure the exporter
 * 3. Import this file at the top of src/server.ts (before any other imports)
 *
 * Supported exporters (configure via environment):
 * - Console: OTEL_EXPORTER=console (default, for development)
 * - OTLP: OTEL_EXPORTER=otlp with OTEL_EXPORTER_OTLP_ENDPOINT
 *
 * For Better Stack: Set OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS
 * For Jaeger: Set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
 */

const OTEL_ENABLED = process.env.OTEL_ENABLED === "true";

async function initTracing() {
  if (!OTEL_ENABLED) {
    console.log("[otel] Tracing disabled. Set OTEL_ENABLED=true to enable.");
    return;
  }

  try {
    // Dynamic imports to avoid requiring OpenTelemetry when not used
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { Resource } = await import("@opentelemetry/resources");
    const {
      ATTR_SERVICE_NAME,
      ATTR_SERVICE_VERSION,
    } = await import("@opentelemetry/semantic-conventions");

    // Get the appropriate exporter based on configuration
    const exporter = await getTraceExporter();

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "perpetually",
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "0.0.0",
      }),
      traceExporter: exporter,
    });

    sdk.start();

    console.log("[otel] Tracing initialized");

    // Graceful shutdown
    process.on("SIGTERM", () => {
      sdk.shutdown().then(
        () => console.log("[otel] Tracing terminated"),
        (err) => console.error("[otel] Error terminating tracing", err)
      );
    });
  } catch (error) {
    console.warn("[otel] Failed to initialize tracing:", error);
    console.warn("[otel] Install dependencies: bun add @opentelemetry/sdk-node @opentelemetry/api");
  }
}

async function getTraceExporter() {
  const exporterType = process.env.OTEL_EXPORTER || "console";

  switch (exporterType) {
    case "otlp": {
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-proto"
      );

      const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      const headers = process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? Object.fromEntries(
            process.env.OTEL_EXPORTER_OTLP_HEADERS.split(",").map((h) => {
              const [key, ...value] = h.split("=");
              return [key.trim(), value.join("=").trim()];
            })
          )
        : undefined;

      console.log("[otel] Using OTLP exporter:", endpoint);

      return new OTLPTraceExporter({
        url: endpoint,
        headers,
      });
    }

    case "console":
    default: {
      const { ConsoleSpanExporter } = await import(
        "@opentelemetry/sdk-trace-node"
      );
      console.log("[otel] Using console exporter (development mode)");
      return new ConsoleSpanExporter();
    }
  }
}

// Initialize on module load
initTracing();

export { initTracing };
