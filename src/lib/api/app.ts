import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { eq, and } from "drizzle-orm";
import { isWithinInterval } from "date-fns";
import db from "@/lib/db/db";
import {
  secretKey,
  license,
  activation,
  product,
  customer,
  licensePolicy,
} from "@/lib/db/schema";
import { validateRoute, activateRoute, deactivateRoute, createLicenseRoute } from "./routes";
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

  // Check if license is disabled/suspended/revoked
  if (foundLicense.status === "suspended" || foundLicense.status === "revoked") {
    return c.json(
      {
        valid: false as const,
        error: ApiErrors.licenseDisabled,
      },
      400
    );
  }

  // Check if license is expired (by status)
  if (foundLicense.status === "expired") {
    return c.json(
      {
        valid: false as const,
        error: ApiErrors.licenseExpired,
      },
      400
    );
  }

  // Check if license is expired (by date)
  const now = new Date();
  if (foundLicense.expiresAt < now) {
    // Update status to expired
    await db
      .update(license)
      .set({ status: "expired" })
      .where(eq(license.id, foundLicense.id));

    return c.json(
      {
        valid: false as const,
        error: ApiErrors.licenseExpired,
      },
      400
    );
  }

  // Check date range
  const isInRange = isWithinInterval(now, {
    start: foundLicense.createdAt,
    end: foundLicense.expiresAt,
  });

  if (!isInRange) {
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
        expiresAt: foundLicense.expiresAt.toISOString(),
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
  if (foundLicense.status === "suspended" || foundLicense.status === "revoked") {
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

// Create License
app.openapi(createLicenseRoute, async (c) => {
  const body = c.req.valid("json");
  const organizationId = c.get("organizationId");

  // Find product by ID and organization
  const [foundProduct] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, body.productId), eq(product.organizationId, organizationId)))
    .limit(1);

  if (!foundProduct) {
    return c.json(
      {
        created: false as const,
        error: ApiErrors.noProductFound,
      },
      404
    );
  }

  // Find or create customer
  let [foundCustomer] = await db
    .select()
    .from(customer)
    .where(and(eq(customer.email, body.email), eq(customer.organizationId, organizationId)))
    .limit(1);

  if (!foundCustomer) {
    [foundCustomer] = await db
      .insert(customer)
      .values({
        name: body.name,
        email: body.email,
        organizationId: organizationId,
      })
      .returning();
  }

  // Get license policy defaults (if any)
  const [policy] = await db
    .select()
    .from(licensePolicy)
    .where(eq(licensePolicy.productId, foundProduct.id))
    .limit(1);

  // Generate license key
  const licenseKey = generateLicenseKey();

  const expiresAt = policy
    ? new Date(Date.now() + policy.licenseLengthDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 year
  const activationLimit = policy?.activationLimit ?? null;

  // Create license
  const [newLicense] = await db
    .insert(license)
    .values({
      key: licenseKey,
      keyCreatedAt: new Date(),
      status: "active",
      expiresAt: expiresAt,
      activationLimit: activationLimit,
      productId: foundProduct.id,
      customerId: foundCustomer.id,
      organizationId: organizationId,
    })
    .returning();

  return c.json(
    {
      created: true as const,
      error: null,
      license: {
        id: newLicense.id,
        createdAt: newLicense.createdAt.toISOString(),
        updatedAt: newLicense.updatedAt.toISOString(),
        expiresAt: newLicense.expiresAt.toISOString(),
        status: newLicense.status.toUpperCase(),
        keyCreatedAt: newLicense.keyCreatedAt.toISOString(),
        key: newLicense.key,
        activationLimit: newLicense.activationLimit,
        productId: newLicense.productId,
        teamId: newLicense.organizationId,
        customerId: newLicense.customerId,
      },
    },
    200
  );
});

// ============================================
// Utilities
// ============================================

function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 4;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

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
