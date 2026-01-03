import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/db/db";
import { license, activation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTestData,
  createActivation,
  cleanupTestData,
  apiRequest,
  ApiErrors,
  type TestData,
} from "./helpers";

describe("POST /api/v1/deactivate", () => {
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
    it("should deactivate an activation successfully", async () => {
      // Create a license with activations
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-DEACT1`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const act = await createActivation(freshLicense.id, testData.organization.id);

      const res = await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {
          activationId: act.id,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.deactivated).toBe(true);
      expect(res.body.error).toBe(null);
      expect(res.body.activation).toBe(null);
    });

    it("should remove activation from database", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-DEACT2`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const act = await createActivation(freshLicense.id, testData.organization.id);

      // Verify activation exists
      const [beforeDeactivate] = await db
        .select()
        .from(activation)
        .where(eq(activation.id, act.id));
      expect(beforeDeactivate).toBeDefined();

      await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {
          activationId: act.id,
        },
      });

      // Verify activation is deleted
      const [afterDeactivate] = await db
        .select()
        .from(activation)
        .where(eq(activation.id, act.id));
      expect(afterDeactivate).toBeUndefined();
    });

    it("should allow reactivation after deactivation", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-REACT`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 1,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Activate
      const activateRes = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: freshLicense.id,
        },
      });
      expect(activateRes.status).toBe(200);
      const activationData = activateRes.body.activation as Record<string, unknown>;

      // Deactivate
      const deactivateRes = await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {
          activationId: activationData.id,
        },
      });
      expect(deactivateRes.status).toBe(200);

      // Reactivate
      const reactivateRes = await apiRequest("POST", "/activate", {
        apiKey: testData.apiKey,
        body: {
          licenseId: freshLicense.id,
        },
      });
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.activated).toBe(true);
    });
  });

  // ==========================================
  // Not Found Cases
  // ==========================================

  describe("Not found cases", () => {
    it("should return 404 for non-existing activationId", async () => {
      const res = await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {
          activationId: "00000000-0000-0000-0000-000000000000",
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.deactivated).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noActivationFound);
    });

    it("should return 404 for activation of other organization", async () => {
      // Create activation in testData2's organization
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-OTHER`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData2.product.id,
          customerId: testData2.customer.id,
          organizationId: testData2.organization.id,
        })
        .returning();

      const otherAct = await createActivation(freshLicense.id, testData2.organization.id);

      // Try to deactivate with testData's API key
      const res = await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {
          activationId: otherAct.id,
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.deactivated).toBe(false);
      expect(res.body.error).toBe(ApiErrors.noActivationFound);
    });

    it("should return 404 when deactivating already deactivated activation", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `TEST-${Date.now()}-DOUBLE`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const act = await createActivation(freshLicense.id, testData.organization.id);

      // First deactivation
      const firstRes = await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {
          activationId: act.id,
        },
      });
      expect(firstRes.status).toBe(200);

      // Second deactivation attempt
      const secondRes = await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {
          activationId: act.id,
        },
      });
      expect(secondRes.status).toBe(404);
      expect(secondRes.body.deactivated).toBe(false);
      expect(secondRes.body.error).toBe(ApiErrors.noActivationFound);
    });
  });

  // ==========================================
  // Validation Error Cases
  // ==========================================

  describe("Validation error cases", () => {
    it("should return 400 for missing activationId", async () => {
      const res = await apiRequest("POST", "/deactivate", {
        apiKey: testData.apiKey,
        body: {},
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const res = await apiRequest("POST", "/deactivate", {
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
      const act = await createActivation(testData.license.id, testData.organization.id);

      const res = await apiRequest("POST", "/deactivate", {
        body: {
          activationId: act.id,
        },
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authorization header required");
    });

    it("should return 403 for invalid API key", async () => {
      const act = await createActivation(testData.license.id, testData.organization.id);

      const res = await apiRequest("POST", "/deactivate", {
        apiKey: "invalid-api-key",
        body: {
          activationId: act.id,
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(ApiErrors.apiKeyInvalid);
    });
  });
});
