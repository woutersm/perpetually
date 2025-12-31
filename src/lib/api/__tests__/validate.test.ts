import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/db/db";
import { license } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTestData,
  createExpiredLicense,
  createSuspendedLicense,
  cleanupTestData,
  apiRequest,
  ApiErrors,
  OpenApiErrors,
  type TestData,
} from "./helpers";

describe("POST /api/v1/validate", () => {
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
    it("should validate a license with valid key", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData.license.id,
          key: testData.license.key,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.error).toBe(null);
      expect(res.body.license).toBeDefined();
      expect(res.body.license).toHaveProperty("id", testData.license.id);
      expect(res.body.license).toHaveProperty("key", testData.license.key);
      expect(res.body.license).toHaveProperty("activations");
      expect(res.body.license).toHaveProperty("activationLimit");
    });

    it("should return license details with correct format", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData.license.id,
          key: testData.license.key,
        },
      });

      expect(res.status).toBe(200);
      const licenseData = res.body.license as Record<string, unknown>;
      expect(typeof licenseData.id).toBe("string");
      expect(typeof licenseData.key).toBe("string");
      expect(typeof licenseData.createdAt).toBe("string");
      // expiresAt can be string or null for perpetual licenses
      expect(licenseData.expiresAt === null || typeof licenseData.expiresAt === "string").toBe(true);
      expect(typeof licenseData.activations).toBe("number");
      expect(typeof licenseData.activationLimit).toBe("number");
    });
  });

  // ==========================================
  // Invalid Key Cases
  // ==========================================

  describe("Invalid key cases", () => {
    it("should reject invalid key", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData.license.id,
          key: testData.license.key + "INVALID",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe(ApiErrors.keyInvalid);
    });

    it("should reject completely wrong key", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData.license.id,
          key: "XXXX-XXXX-XXXX-XXXX",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe(ApiErrors.keyInvalid);
    });
  });

  // ==========================================
  // Expired License Cases
  // ==========================================

  describe("Expired license cases", () => {
    it("should reject expired license (by date)", async () => {
      const expiredLicense = await createExpiredLicense(testData);

      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: expiredLicense.id,
          key: expiredLicense.key,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe(ApiErrors.licenseExpired);
    });

    it("should reject license expired by date", async () => {
      // Create a license that's active but past expiration date
      const [pastExpiredLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-EXPR`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() - 1000), // Expired
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: pastExpiredLicense.id,
          key: pastExpiredLicense.key,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe(ApiErrors.licenseExpired);
    });
  });

  // ==========================================
  // Disabled/Suspended License Cases
  // ==========================================

  describe("Disabled license cases", () => {
    it("should reject disabled license", async () => {
      const disabledLicense = await createSuspendedLicense(testData);

      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: disabledLicense.id,
          key: disabledLicense.key,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe(ApiErrors.licenseDisabled);
    });
  });

  // ==========================================
  // Not Found Cases
  // ==========================================

  describe("Not found cases", () => {
    it("should return 404 for non-existing licenseId", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: "non-existent-id-12345",
          key: testData.license.key,
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noLicenseFound);
    });

    it("should return 404 for license of other organization", async () => {
      // Try to access testData2's license with testData's API key
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData2.license.id,
          key: testData2.license.key,
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noLicenseFound);
    });
  });

  // ==========================================
  // Validation Error Cases
  // ==========================================

  describe("Validation error cases", () => {
    it("should return 400 for missing licenseId", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          key: testData.license.key,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing key", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData.license.id,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const res = await apiRequest("POST", "/validate", {
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
      const res = await apiRequest("POST", "/validate", {
        body: {
          licenseId: testData.license.id,
          key: testData.license.key,
        },
      });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe(OpenApiErrors.unauthorized);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect((res.body.errors as Array<{ message: string }>)[0].message).toBe(
        "Authorization header required"
      );
    });

    it("should return 403 for invalid API key", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: "invalid-api-key",
        body: {
          licenseId: testData.license.id,
          key: testData.license.key,
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe(OpenApiErrors.unauthorized);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect((res.body.errors as Array<{ message: string }>)[0].message).toBe(
        ApiErrors.apiKeyInvalid
      );
    });

    it("should return 403 for malformed Bearer token", async () => {
      const res = await apiRequest("POST", "/validate", {
        apiKey: "malformed-token-123", // Malformed token (not a valid API key)
        body: {
          licenseId: testData.license.id,
          key: testData.license.key,
        },
      });

      expect(res.status).toBe(403);
    });
  });
});
