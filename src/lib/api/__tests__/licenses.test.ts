import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/db/db";
import { product, customer, license, licensePolicy } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createTestData,
  cleanupTestData,
  apiRequest,
  ApiErrors,
  OpenApiErrors,
  type TestData,
} from "./helpers";

describe("POST /api/v1/licenses", () => {
  let testData: TestData;
  let testData2: TestData; // For cross-org tests

  beforeAll(async () => {
    testData = await createTestData();
    testData2 = await createTestData();
  });

  afterAll(async () => {
    await cleanupTestData(testData);
    await cleanupTestData(testData2);
  });

  // ==========================================
  // Success Cases
  // ==========================================

  describe("Success cases", () => {
    it("should create a license successfully", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "New Customer",
          email: `new-customer-${Date.now()}@example.com`,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(true);
      expect(res.body.error).toBe(null);
      expect(res.body.license).toBeDefined();
      expect(res.body.license).toHaveProperty("id");
      expect(res.body.license).toHaveProperty("key");
      expect(res.body.license).toHaveProperty("status", "ACTIVE");
    });

    it("should return license details with correct format", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "Format Test Customer",
          email: `format-test-${Date.now()}@example.com`,
        },
      });

      expect(res.status).toBe(200);
      const licenseData = res.body.license as Record<string, unknown>;
      expect(typeof licenseData.id).toBe("string");
      expect(typeof licenseData.key).toBe("string");
      expect(typeof licenseData.createdAt).toBe("string");
      expect(typeof licenseData.updatedAt).toBe("string");
      expect(typeof licenseData.expiresAt).toBe("string");
      expect(typeof licenseData.status).toBe("string");
      expect(typeof licenseData.keyCreatedAt).toBe("string");
      expect(typeof licenseData.productId).toBe("string");
      expect(typeof licenseData.teamId).toBe("string");
      expect(typeof licenseData.customerId).toBe("string");
    });

    it("should create license with key in correct format (XXXX-XXXX-XXXX-XXXX)", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "Key Format Customer",
          email: `key-format-${Date.now()}@example.com`,
        },
      });

      expect(res.status).toBe(200);
      const licenseData = res.body.license as Record<string, unknown>;
      const key = licenseData.key as string;
      expect(key).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it("should reuse existing customer by email", async () => {
      const email = `reuse-customer-${Date.now()}@example.com`;

      // Create first license
      const res1 = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "Customer Name",
          email: email,
        },
      });
      expect(res1.status).toBe(200);
      const license1 = res1.body.license as Record<string, unknown>;

      // Create second license with same email
      const res2 = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "Customer Name Updated",
          email: email,
        },
      });
      expect(res2.status).toBe(200);
      const license2 = res2.body.license as Record<string, unknown>;

      // Should use the same customer
      expect(license1.customerId).toBe(license2.customerId);
    });

    it("should apply license policy defaults when available", async () => {
      // Create a product with a policy
      const [policyProduct] = await db
        .insert(product)
        .values({
          name: `Policy Product ${Date.now()}`,
          slug: `policy-product-${Date.now()}`,
          status: "active",
          organizationId: testData.organization.id,
        })
        .returning();

      // Create a license policy for the product
      await db.insert(licensePolicy).values({
        name: "Test Policy",
        type: "perpetual",
        licenseLengthDays: 30, // 30 days instead of default 365
        activationLimit: 3,
        productId: policyProduct.id,
      });

      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: policyProduct.id,
          name: "Policy Customer",
          email: `policy-customer-${Date.now()}@example.com`,
        },
      });

      expect(res.status).toBe(200);
      const licenseData = res.body.license as Record<string, unknown>;
      expect(licenseData.activationLimit).toBe(3);

      // Verify expiration is ~30 days from now
      const expiresAt = new Date(licenseData.expiresAt as string);
      const now = new Date();
      const daysDiff = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });
  });

  // ==========================================
  // Product Not Found Cases
  // ==========================================

  describe("Product not found cases", () => {
    it("should return 404 for non-existing productId", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: "non-existent-product-id",
          name: "Test Customer",
          email: "test@example.com",
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.created).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noProductFound);
    });

    it("should return 404 for product of other organization", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData2.product.id,
          name: "Test Customer",
          email: "test@example.com",
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.created).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noProductFound);
    });
  });

  // ==========================================
  // Validation Error Cases
  // ==========================================

  describe("Validation error cases", () => {
    it("should return 400 for missing productId", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          name: "Test Customer",
          email: "test@example.com",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing name", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          email: "test@example.com",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing email", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "Test Customer",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid email format", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "Test Customer",
          email: "not-an-email",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {},
      });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // Authentication Cases
  // ==========================================

  describe("Authentication cases", () => {
    it("should return 401 without Authorization header", async () => {
      const res = await apiRequest("POST", "/licenses", {
        body: {
          productId: testData.product.id,
          name: "Test Customer",
          email: "test@example.com",
        },
      });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe(OpenApiErrors.unauthorized);
    });

    it("should return 403 for invalid API key", async () => {
      const res = await apiRequest("POST", "/licenses", {
        apiKey: "invalid-api-key",
        body: {
          productId: testData.product.id,
          name: "Test Customer",
          email: "test@example.com",
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe(OpenApiErrors.unauthorized);
    });
  });

  // ==========================================
  // Database Persistence Cases
  // ==========================================

  describe("Database persistence cases", () => {
    it("should persist license in database", async () => {
      const email = `persist-test-${Date.now()}@example.com`;

      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: "Persist Test",
          email: email,
        },
      });

      expect(res.status).toBe(200);
      const licenseData = res.body.license as Record<string, unknown>;

      // Verify license exists in database
      const [dbLicense] = await db
        .select()
        .from(license)
        .where(eq(license.id, licenseData.id as string));

      expect(dbLicense).toBeDefined();
      expect(dbLicense.key).toBe(licenseData.key);
      expect(dbLicense.status).toBe("active");
      expect(dbLicense.productId).toBe(testData.product.id);
    });

    it("should create customer in database if not exists", async () => {
      const email = `new-db-customer-${Date.now()}@example.com`;
      const name = "New DB Customer";

      const res = await apiRequest("POST", "/licenses", {
        apiKey: testData.apiKey,
        body: {
          productId: testData.product.id,
          name: name,
          email: email,
        },
      });

      expect(res.status).toBe(200);

      // Verify customer exists in database
      const [dbCustomer] = await db
        .select()
        .from(customer)
        .where(and(eq(customer.email, email), eq(customer.organizationId, testData.organization.id)));

      expect(dbCustomer).toBeDefined();
      expect(dbCustomer.name).toBe(name);
      expect(dbCustomer.email).toBe(email);
    });
  });
});
