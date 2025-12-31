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
import app from "../app";

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
      status: "active",
      organizationId: org.id,
    })
    .returning();

  // Create license policy with product ID
  const [policy] = await db
    .insert(licensePolicy)
    .values({
      name: "Test Policy",
      type: "perpetual",
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
// Helper to create expired license
// ============================================

export async function createExpiredLicense(testData: TestData) {
  const licenseKey = generateLicenseKey();

  const [lic] = await db
    .insert(license)
    .values({
      key: licenseKey,
      keyCreatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // Created 400 days ago
      status: "expired",
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
// Helper to create suspended license
// ============================================

export async function createSuspendedLicense(testData: TestData) {
  const licenseKey = generateLicenseKey();

  const [lic] = await db
    .insert(license)
    .values({
      key: licenseKey,
      keyCreatedAt: new Date(),
      status: "suspended",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      activationLimit: 5,
      productId: testData.product.id,
      customerId: testData.customer.id,
      organizationId: testData.organization.id,
    })
    .returning();

  return lic;
}

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
// API Request Helper
// ============================================

export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: {
    body?: Record<string, unknown>;
    apiKey?: string;
    headers?: Record<string, string>;
  } = {}
) {
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

  const response = await app.fetch(request);
  const text = await response.text();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
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
