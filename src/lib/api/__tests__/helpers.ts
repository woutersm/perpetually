import db from "@/lib/db/db";
import {
  organization,
  secretKey,
  product,
  customer,
  license,
  activation,
  licensePolicy,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Import route handlers - access the POST handler from Route.options.server.handlers.POST
import { Route as ValidateRoute } from "@/routes/api/v1/validate";
import { Route as ActivateRoute } from "@/routes/api/v1/activate";
import { Route as DeactivateRoute } from "@/routes/api/v1/deactivate";

// ============================================
// Test Factory - Creates test data
// ============================================

export interface TestData {
  organization: typeof organization.$inferSelect;
  secretKey: typeof secretKey.$inferSelect;
  product: typeof product.$inferSelect;
  customer: typeof customer.$inferSelect;
  license: typeof license.$inferSelect;
  apiKey: string;
}

let testCounter = 0;

export async function createTestData(): Promise<TestData> {
  testCounter++;
  const suffix = `${Date.now()}-${testCounter}`;

  // Create organization
  const [org] = await db
    .insert(organization)
    .values({
      name: `Test Org ${suffix}`,
      slug: `test-org-${suffix}`,
      apiKey: `pub_test_${suffix}`,
      isOnboarded: true,
    })
    .returning();

  // Create secret key (API key for authentication)
  const apiKeyValue = `sk_test_${suffix}`;
  const [sk] = await db
    .insert(secretKey)
    .values({
      key: apiKeyValue,
      name: "Test API Key",
      organizationId: org.id,
    })
    .returning();

  // Create product first (before license policy due to FK constraint)
  const [prod] = await db
    .insert(product)
    .values({
      name: `Test Product ${suffix}`,
      slug: `test-product-${suffix}`,
      isActive: true,
      organizationId: org.id,
    })
    .returning();

  // Create license policy with product ID
  const [policy] = await db
    .insert(licensePolicy)
    .values({
      name: "Test Policy",
      licenseLengthDays: 365,
      activationLimit: 1,
      productId: prod.id,
    })
    .returning();

  // Create customer
  const [cust] = await db
    .insert(customer)
    .values({
      name: `Test Customer ${suffix}`,
      email: `test-${suffix}@example.com`,
      organizationId: org.id,
    })
    .returning();

  // Generate license key
  const licenseKey = generateLicenseKey();

  // Create license (active, expires in 1 year)
  const [lic] = await db
    .insert(license)
    .values({
      key: licenseKey,
      keyCreatedAt: new Date(),
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      activationLimit: 1,
      productId: prod.id,
      customerId: cust.id,
      organizationId: org.id,
      licensePolicyId: policy.id,
    })
    .returning();

  return {
    organization: org,
    secretKey: sk,
    product: prod,
    customer: cust,
    license: lic,
    apiKey: apiKeyValue,
  };
}

// ============================================
// Helper to create expired license (by date, not status)
// ============================================

export async function createExpiredLicense(testData: TestData) {
  const licenseKey = generateLicenseKey();

  const [lic] = await db
    .insert(license)
    .values({
      key: licenseKey,
      keyCreatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // Created 400 days ago
      status: "active", // Status is still active, but expired by date
      expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
      activationLimit: 5,
      productId: testData.product.id,
      customerId: testData.customer.id,
      organizationId: testData.organization.id,
    })
    .returning();

  return lic;
}

// ============================================
// Helper to create disabled license
// ============================================

export async function createDisabledLicense(testData: TestData) {
  const licenseKey = generateLicenseKey();

  const [lic] = await db
    .insert(license)
    .values({
      key: licenseKey,
      keyCreatedAt: new Date(),
      status: "disabled",
      disabledAt: new Date(),
      disabledReason: "customer_request",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      activationLimit: 5,
      productId: testData.product.id,
      customerId: testData.customer.id,
      organizationId: testData.organization.id,
    })
    .returning();

  return lic;
}

// Keep backwards-compatible alias
export const createSuspendedLicense = createDisabledLicense;

// ============================================
// Helper to create activation
// ============================================

export async function createActivation(licenseId: string, organizationId: string, name?: string) {
  const [act] = await db
    .insert(activation)
    .values({
      name: name ?? "Test Activation",
      licenseId,
      organizationId,
    })
    .returning();

  return act;
}

// ============================================
// License key generator
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
// Route Handler Access
// ============================================

// Extract POST handlers from routes
// The routes export Route which has options.server.handlers.POST
type RouteWithServer = {
  options: {
    server?: {
      handlers?: {
        POST?: (ctx: { request: Request }) => Promise<Response>;
      };
    };
  };
};

const routeHandlers: Record<string, (ctx: { request: Request }) => Promise<Response>> = {
  "/validate": (ValidateRoute as RouteWithServer).options.server?.handlers?.POST!,
  "/activate": (ActivateRoute as RouteWithServer).options.server?.handlers?.POST!,
  "/deactivate": (DeactivateRoute as RouteWithServer).options.server?.handlers?.POST!,
};

// ============================================
// API Request Helper
// ============================================

/**
 * Simulates an API request to a route handler.
 * Calls the route handler directly with a mock Request object.
 */
export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: {
    body?: Record<string, unknown>;
    apiKey?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (options.apiKey) {
    headers["Authorization"] = `Bearer ${options.apiKey}`;
  }

  const request = new Request(`http://localhost/api/v1${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Get the handler for this path
  const handler = routeHandlers[path];
  if (!handler) {
    return { status: 404, body: { error: "Route not found" } };
  }

  // Call the handler directly
  const response = await handler({ request });

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    status: response.status,
    body: json as Record<string, unknown>,
  };
}

// ============================================
// Cleanup helper
// ============================================

export async function cleanupTestData(testData: TestData) {
  // Delete in reverse order of dependencies
  await db.delete(activation).where(eq(activation.organizationId, testData.organization.id));
  await db.delete(license).where(eq(license.organizationId, testData.organization.id));
  await db.delete(licensePolicy).where(eq(licensePolicy.productId, testData.product.id));
  await db.delete(customer).where(eq(customer.organizationId, testData.organization.id));
  await db.delete(product).where(eq(product.organizationId, testData.organization.id));
  await db.delete(secretKey).where(eq(secretKey.organizationId, testData.organization.id));
  await db.delete(organization).where(eq(organization.id, testData.organization.id));
}

// ============================================
// Error constants for assertions
// ============================================

export const ApiErrors = {
  apiKeyInvalid: "Invalid API key",
  noLicenseFound: "No license found",
  noActivationFound: "No activation found",
  licenseDisabled: "License is disabled",
  licenseExpired: "License is expired",
  keyInvalid: "No valid key",
  activationLimitReached: "Activation limit reached",
  noProductFound: "No product found",
} as const;

export const OpenApiErrors = {
  badRequest: "Bad Request",
  unauthorized: "Unauthorized",
} as const;
