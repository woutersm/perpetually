import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/db/db";
import { license, activation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTestData,
  createExpiredLicense,
  createSuspendedLicense,
  createActivation,
  cleanupTestData,
  apiRequest,
  ApiErrors,
  OpenApiErrors,
  type TestData,
} from "./helpers";

describe("POST /api/v1/activate", () => {
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
    it("should activate a license successfully", async () => {
      // Create a fresh license with higher activation limit
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-ACT1`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: freshLicense.id,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.activated).toBe(true);
      expect(res.body.error).toBe(null);
      expect(res.body.activation).toBeDefined();
      expect(res.body.activation).toHaveProperty("id");
      expect(res.body.activation).toHaveProperty("licenseId", freshLicense.id);
    });

    it("should activate with a name identifier", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-ACT2`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: freshLicense.id,
          name: "user@example.com",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.activated).toBe(true);
      const activationData = res.body.activation as Record<string, unknown>;
      expect(activationData.name).toBe("user@example.com");
    });

    it("should return activation details with correct format", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-ACT3`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: freshLicense.id,
        },
      });

      expect(res.status).toBe(200);
      const activationData = res.body.activation as Record<string, unknown>;
      expect(typeof activationData.id).toBe("string");
      expect(typeof activationData.createdAt).toBe("string");
      expect(typeof activationData.updatedAt).toBe("string");
      expect(typeof activationData.teamId).toBe("string");
      expect(typeof activationData.licenseId).toBe("string");
    });
  });

  // ==========================================
  // Activation Limit Cases
  // ==========================================

  describe("Activation limit cases", () => {
    it("should reject activation when limit is reached", async () => {
      // testData.license has activationLimit of 1
      // First, ensure there's already an activation
      await createActivation(testData.license.id, testData.organization.id);

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData.license.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.activated).toBe(false);
      expect(res.body.error).toBe(ApiErrors.activationLimitReached);
    });

    it("should allow activation when under limit", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-LIM`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 3,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Create 2 activations (under limit of 3)
      await createActivation(freshLicense.id, testData.organization.id, "Device 1");
      await createActivation(freshLicense.id, testData.organization.id, "Device 2");

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: freshLicense.id,
          name: "Device 3",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.activated).toBe(true);
    });

    it("should allow unlimited activations when limit is null", async () => {
      const [unlimitedLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-UNL`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: null,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Create many activations
      for (let i = 0; i < 10; i++) {
        await createActivation(unlimitedLicense.id, testData.organization.id, `Device ${i}`);
      }

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: unlimitedLicense.id,
          name: "Device 11",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.activated).toBe(true);
    });
  });

  // ==========================================
  // Disabled License Cases
  // ==========================================

  describe("Disabled license cases", () => {
    it("should reject activation for disabled license", async () => {
      const disabledLicense = await createSuspendedLicense(testData);

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: disabledLicense.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.activated).toBe(false);
      expect(res.body.error).toBe(ApiErrors.licenseDisabled);
    });
  });

  // ==========================================
  // Expired License Cases
  // ==========================================

  describe("Expired license cases", () => {
    it("should reject activation for expired license", async () => {
      const expiredLicense = await createExpiredLicense(testData);

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: expiredLicense.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.activated).toBe(false);
      expect(res.body.error).toBe(ApiErrors.licenseExpired);
    });

    it("should allow activation for license with null expiresAt (perpetual)", async () => {
      const [perpetualLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-PERP`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: null, // Perpetual license
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: perpetualLicense.id,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.activated).toBe(true);
    });
  });

  // ==========================================
  // Not Found Cases
  // ==========================================

  describe("Not found cases", () => {
    it("should return 404 for non-existing licenseId", async () => {
      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: "00000000-0000-0000-0000-000000000000",
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.activated).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noLicenseFound);
    });

    it("should return 404 for license of other organization", async () => {
      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: testData2.license.id,
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.activated).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noLicenseFound);
    });
  });

  // ==========================================
  // Validation Error Cases
  // ==========================================

  describe("Validation error cases", () => {
    it("should return 400 for missing licenseId", async () => {
      const res = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {},
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const res = await apiRequest("POST", "/activate", {
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
      const res = await apiRequest("POST", "/activate", {
        body: {
          licenseId: testData.license.id,
        },
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authorization header required");
    });

    it("should return 403 for invalid API key", async () => {
      const res = await apiRequest("POST", "/activate", {
        apiKey: "invalid-api-key",
        body: {
          licenseId: testData.license.id,
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(ApiErrors.apiKeyInvalid);
    });
  });
});
