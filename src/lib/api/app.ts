import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { eq, and } from "drizzle-orm";
import db from "@/lib/db/db";
import { secretKey, license, activation } from "@/lib/db/schema";
import { validateRoute, activateRoute, deactivateRoute } from "./routes";
import { ApiErrors, OpenApiErrors } from "./schemas";

// ============================================
// Types
// ============================================

type AuthenticatedContext = {
  Variables: {
    organizationId: string;
  };
};

// ============================================
// App Setup
// ============================================

const app = new OpenAPIHono<AuthenticatedContext>().basePath("/api/v1");

// ============================================
// Authentication Middleware
// ============================================

app.use("/*", async (c, next) => {
  // Skip auth for documentation endpoints
  const path = c.req.path;
  if (path === "/api/v1/doc" || path === "/api/v1/ui" || path.startsWith("/api/v1/ui/")) {
    return next();
  }

  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json(
      {
        type: OpenApiErrors.unauthorized,
        errors: [{ path: c.req.path, message: "Authorization header required" }],
      },
      401
    );
  }

  const token = authHeader.replace("Bearer ", "");

  // Look up organization by API key
  const [foundKey] = await db
    .select({
      id: secretKey.id,
      organizationId: secretKey.organizationId,
    })
    .from(secretKey)
    .where(eq(secretKey.key, token))
    .limit(1);

  if (!foundKey) {
    return c.json(
      {
        type: OpenApiErrors.unauthorized,
        errors: [{ path: c.req.path, message: ApiErrors.apiKeyInvalid }],
      },
      403
    );
  }

  // Update last used timestamp
  await db
    .update(secretKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(secretKey.id, foundKey.id));

  c.set("organizationId", foundKey.organizationId);

  await next();
});

// ============================================
// Route Handlers
// ============================================

// Validate License
app.openapi(validateRoute, async (c) => {
  const body = c.req.valid("json");
  const organizationId = c.get("organizationId");

  // Find license by ID and organization
  const [foundLicense] = await db
    .select()
    .from(license)
    .where(and(eq(license.id, body.licenseId), eq(license.organizationId, organizationId)))
    .limit(1);

  if (!foundLicense) {
    return c.json(
      {
        valid: false as const,
        error: ApiErrors.noLicenseFound,
      },
      404
    );
  }

  // Check if key matches
  if (foundLicense.key !== body.key) {
    return c.json(
      {
        valid: false as const,
        error: ApiErrors.keyInvalid,
      },
      400
    );
  }

  // Check if license is disabled
  if (foundLicense.status === "disabled") {
    return c.json(
      {
        valid: false as const,
        error: ApiErrors.licenseDisabled,
      },
      400
    );
  }

  // Check if license is expired (by date) - expiresAt can be null for perpetual licenses
  const now = new Date();
  if (foundLicense.expiresAt && foundLicense.expiresAt < now) {
    return c.json(
      {
        valid: false as const,
        error: ApiErrors.licenseExpired,
      },
      400
    );
  }

  // Get activation count
  const activations = await db
    .select()
    .from(activation)
    .where(eq(activation.licenseId, foundLicense.id));

  return c.json(
    {
      valid: true as const,
      error: null,
      license: {
        id: foundLicense.id,
        key: foundLicense.key,
        createdAt: foundLicense.createdAt.toISOString(),
        expiresAt: foundLicense.expiresAt?.toISOString() ?? null,
        activations: activations.length,
        activationLimit: foundLicense.activationLimit ?? 0,
      },
    },
    200
  );
});

// Activate License
app.openapi(activateRoute, async (c) => {
  const body = c.req.valid("json");
  const organizationId = c.get("organizationId");

  // Find license by ID and organization
  const [foundLicense] = await db
    .select()
    .from(license)
    .where(and(eq(license.id, body.licenseId), eq(license.organizationId, organizationId)))
    .limit(1);

  if (!foundLicense) {
    return c.json(
      {
        activated: false as const,
        error: ApiErrors.noLicenseFound,
      },
      404
    );
  }

  // Check if license is disabled
  if (foundLicense.status === "disabled") {
    return c.json(
      {
        activated: false as const,
        error: ApiErrors.licenseDisabled,
      },
      400
    );
  }

  // Get current activation count
  const existingActivations = await db
    .select()
    .from(activation)
    .where(eq(activation.licenseId, foundLicense.id));

  // Check activation limit
  if (
    foundLicense.activationLimit !== null &&
    existingActivations.length >= foundLicense.activationLimit
  ) {
    return c.json(
      {
        activated: false as const,
        error: ApiErrors.activationLimitReached,
      },
      400
    );
  }

  // Create activation
  const [newActivation] = await db
    .insert(activation)
    .values({
      name: body.name ?? null,
      licenseId: foundLicense.id,
      organizationId: organizationId,
    })
    .returning();

  return c.json(
    {
      activated: true as const,
      error: null,
      activation: {
        id: newActivation.id,
        createdAt: newActivation.createdAt.toISOString(),
        updatedAt: newActivation.updatedAt.toISOString(),
        teamId: newActivation.organizationId,
        name: newActivation.name,
        licenseId: newActivation.licenseId,
      },
    },
    200
  );
});

// Deactivate License
app.openapi(deactivateRoute, async (c) => {
  const body = c.req.valid("json");
  const organizationId = c.get("organizationId");

  // Find activation by ID and organization
  const [foundActivation] = await db
    .select()
    .from(activation)
    .where(
      and(eq(activation.id, body.activationId), eq(activation.organizationId, organizationId))
    )
    .limit(1);

  if (!foundActivation) {
    return c.json(
      {
        deactivated: false as const,
        error: ApiErrors.noActivationFound,
      },
      404
    );
  }

  // Delete the activation
  await db.delete(activation).where(eq(activation.id, foundActivation.id));

  return c.json(
    {
      deactivated: true as const,
      error: null,
      activation: null,
    },
    200
  );
});

// Note: POST /licenses was removed in Phase 2
// Licenses are created automatically via Stripe webhooks

// ============================================
// OpenAPI Documentation
// ============================================

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "License Management API",
    version: "1.0.0",
    description: "API for validating, activating, and managing software licenses",
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1",
    },
  ],
  security: [{ Bearer: [] }],
});

// Register security scheme
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  description: "API key obtained from your organization settings",
});

// Swagger UI at /api/v1/ui
app.get("/ui", swaggerUI({ url: "/api/v1/doc" }));

export default app;
