import { createFileRoute } from "@tanstack/react-router";
import app from "@/lib/api/app";

/**
 * Catch-all route that mounts the Hono OpenAPI app at /api/v1/*
 *
 * This handles all API requests:
 * - POST /api/v1/validate
 * - POST /api/v1/activate
 * - POST /api/v1/deactivate
 * - POST /api/v1/licenses
 * - GET  /api/v1/doc (OpenAPI spec JSON)
 * - GET  /api/v1/ui (Swagger UI)
 */
export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: ({ request }) => {
        return app.fetch(request);
      },
      POST: ({ request }) => {
        return app.fetch(request);
      },
      PUT: ({ request }) => {
        return app.fetch(request);
      },
      DELETE: ({ request }) => {
        return app.fetch(request);
      },
      PATCH: ({ request }) => {
        return app.fetch(request);
      },
    },
  },
});
