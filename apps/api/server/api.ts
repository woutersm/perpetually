import express, { Router, Request } from "express";
import { RegisterRoutes } from "./routes";
import { requestContext } from "./context";
import { errorHandler, notFoundHandler } from "./errors";

export const api: Router = express.Router();

// Body parsing middleware
api.use(express.json());
api.use(express.text());
api.use(express.urlencoded({ extended: false }));

// Request context middleware - makes request available to controllers via AsyncLocalStorage
api.use((req: Request, _res, next) => {
  requestContext.run(req, next);
});

// Health check endpoint (no auth required)
api.get("/ping", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Register all tsoa-generated routes
// Security/auth is handled via @Security() decorators and expressAuthentication function
RegisterRoutes(api);

// 404 handler for undefined routes - must come after route registration
api.use(notFoundHandler);

// Global error handler - must be last
// Handles ValidateError, custom errors with status codes, and generic server errors
api.use(errorHandler);

export default api;
