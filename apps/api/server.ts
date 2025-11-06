import express from "express";
import compression from "compression";
import morgan from "morgan";
import consola from "consola";
import { fileURLToPath } from "url";
import { dirname } from "path";
import api from "./server/api";
// Import controllers for tsoa spec generation
import "./server/controllers/LicenseController";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(compression());
app.use(morgan("combined"));

// Serve OpenAPI spec
app.get("/api.yaml", (_req, res) => {
  res.sendFile(`${__dirname}/api.yaml`);
});

// Root health check endpoint (outside of /v1 path)
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Mount API routes at root (not under /api since this is a dedicated API server)
// All routes are handled by the api router with error handling
app.use("/", api);

// Start server
const server = app.listen(port, () => {
  consola.success(`API Server running on http://localhost:${port}`);
  consola.info(`API endpoints available at http://localhost:${port}/v1/*`);
  consola.info(`Health check available at http://localhost:${port}/health`);
  consola.info(`API spec available at http://localhost:${port}/api.yaml`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  consola.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    consola.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  consola.info("SIGINT signal received: closing HTTP server");
  server.close(() => {
    consola.info("HTTP server closed");
    process.exit(0);
  });
});
