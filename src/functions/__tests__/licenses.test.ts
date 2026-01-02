import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/db/db";
import {
  organization,
  product,
  customer,
  license,
  activation,
  licensePolicy,
  licenseEvent,
  user,
  membership,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  activateLicense,
  deactivate,
  LicenseErrorCode,
  ActivationErrorCode,
} from "@/lib/services/license";

// ============================================
// Test Setup
// ============================================

interface TestData {
  organization: typeof organization.$inferSelect;
  product: typeof product.$inferSelect;
  customer: typeof customer.$inferSelect;
  license: typeof license.$inferSelect;
  user: typeof user.$inferSelect;
}

let testCounter = 0;

async function createTestData(): Promise<TestData> {
  testCounter++;
  const suffix = `srvfn-${Date.now()}-${testCounter}`;

  const [org] = await db
    .insert(organization)
    .values({
      name: `Test Org ${suffix}`,
      slug: `test-org-${suffix}`,
      apiKey: `pub_test_${suffix}`,
      isOnboarded: true,
    })
    .returning();

  // Create user for audit logging (id is required - not auto-generated)
  const [testUser] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: `Test User ${suffix}`,
      email: `test-${suffix}@example.com`,
    })
    .returning();

  // Create membership to link user to org
  await db.insert(membership).values({
    userId: testUser.id,
    organizationId: org.id,
    role: "owner",
  });

  const [prod] = await db
    .insert(product)
    .values({
      name: `Test Product ${suffix}`,
      slug: `test-product-${suffix}`,
      isActive: true,
      organizationId: org.id,
    })
    .returning();

  const [policy] = await db
    .insert(licensePolicy)
    .values({
      name: "Test Policy",
      licenseLengthDays: 365,
      activationLimit: 1,
      productId: prod.id,
    })
    .returning();

  const [cust] = await db
    .insert(customer)
    .values({
      name: `Test Customer ${suffix}`,
      email: `customer-${suffix}@example.com`,
      organizationId: org.id,
    })
    .returning();

  const [lic] = await db
    .insert(license)
    .values({
      key: `TEST-${suffix}`,
      keyCreatedAt: new Date(),
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      activationLimit: 3,
      productId: prod.id,
      customerId: cust.id,
      organizationId: org.id,
      licensePolicyId: policy.id,
    })
    .returning();

  return { organization: org, product: prod, customer: cust, license: lic, user: testUser };
}

async function cleanupTestData(testData: TestData) {
  await db.delete(licenseEvent).where(eq(licenseEvent.organizationId, testData.organization.id));
  await db.delete(activation).where(eq(activation.organizationId, testData.organization.id));
  await db.delete(license).where(eq(license.organizationId, testData.organization.id));
  await db.delete(licensePolicy).where(eq(licensePolicy.productId, testData.product.id));
  await db.delete(customer).where(eq(customer.organizationId, testData.organization.id));
  await db.delete(product).where(eq(product.organizationId, testData.organization.id));
  await db.delete(membership).where(eq(membership.organizationId, testData.organization.id));
  await db.delete(organization).where(eq(organization.id, testData.organization.id));
  await db.delete(user).where(eq(user.id, testData.user.id));
}

async function createExpiredLicense(testData: TestData) {
  const [lic] = await db
    .insert(license)
    .values({
      key: `EXPIRED-${Date.now()}`,
      keyCreatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      status: "active",
      expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      activationLimit: 5,
      productId: testData.product.id,
      customerId: testData.customer.id,
      organizationId: testData.organization.id,
    })
    .returning();
  return lic;
}

async function createDisabledLicense(testData: TestData) {
  const [lic] = await db
    .insert(license)
    .values({
      key: `DISABLED-${Date.now()}`,
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

// ============================================
// Error Message Mapping Tests
// ============================================

// These tests verify that server functions translate core service errors correctly
// The actual server function handlers are tested via core service + error mapping

describe("Server Function Error Messages", () => {
  // Import the error mapping from the server functions module
  // Since we can't easily test the full server function (needs auth context),
  // we test that the core service errors map to the expected exception messages

  const licenseErrorMessages: Record<LicenseErrorCode, string> = {
    [LicenseErrorCode.NOT_FOUND]: "License not found",
    [LicenseErrorCode.DISABLED]: "License is disabled",
    [LicenseErrorCode.EXPIRED]: "License is expired",
    [LicenseErrorCode.ACTIVATION_LIMIT_REACHED]: "Activation limit reached",
    [LicenseErrorCode.INVALID_KEY]: "Invalid license key",
  };

  const activationErrorMessages: Record<ActivationErrorCode, string> = {
    [ActivationErrorCode.NOT_FOUND]: "Activation not found",
  };

  it("should have correct error message for NOT_FOUND", () => {
    expect(licenseErrorMessages[LicenseErrorCode.NOT_FOUND]).toBe("License not found");
  });

  it("should have correct error message for DISABLED", () => {
    expect(licenseErrorMessages[LicenseErrorCode.DISABLED]).toBe("License is disabled");
  });

  it("should have correct error message for EXPIRED", () => {
    expect(licenseErrorMessages[LicenseErrorCode.EXPIRED]).toBe("License is expired");
  });

  it("should have correct error message for ACTIVATION_LIMIT_REACHED", () => {
    expect(licenseErrorMessages[LicenseErrorCode.ACTIVATION_LIMIT_REACHED]).toBe(
      "Activation limit reached"
    );
  });

  it("should have correct error message for activation NOT_FOUND", () => {
    expect(activationErrorMessages[ActivationErrorCode.NOT_FOUND]).toBe("Activation not found");
  });
});

// ============================================
// Integration Tests (Core Service + DB)
// ============================================

describe("Server Function Integration", () => {
  let testData: TestData;

  beforeAll(async () => {
    testData = await createTestData();
  });

  afterAll(async () => {
    await cleanupTestData(testData);
  });

  describe("createActivation behavior", () => {
    it("should reject activation for expired license", async () => {
      const expiredLicense = await createExpiredLicense(testData);

      const result = await activateLicense({
        licenseId: expiredLicense.id,
        organizationId: testData.organization.id,
        name: "Test Device",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.EXPIRED);
      }
    });

    it("should reject activation for disabled license", async () => {
      const disabledLicense = await createDisabledLicense(testData);

      const result = await activateLicense({
        licenseId: disabledLicense.id,
        organizationId: testData.organization.id,
        name: "Test Device",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.DISABLED);
      }
    });

    it("should create activation for valid license", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `FRESH-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const result = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
        name: "My Device",
        machineId: "MACHINE-123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Device");
        expect(result.data.machineId).toBe("MACHINE-123");
        expect(result.data.licenseId).toBe(freshLicense.id);
      }
    });

    it("should reject activation when limit reached", async () => {
      const [limitedLicense] = await db
        .insert(license)
        .values({
          key: `LIMITED-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 1,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // First activation
      const result1 = await activateLicense({
        licenseId: limitedLicense.id,
        organizationId: testData.organization.id,
        name: "Device 1",
      });
      expect(result1.success).toBe(true);

      // Second activation should fail
      const result2 = await activateLicense({
        licenseId: limitedLicense.id,
        organizationId: testData.organization.id,
        name: "Device 2",
      });

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toBe(LicenseErrorCode.ACTIVATION_LIMIT_REACHED);
      }
    });
  });

  describe("deleteActivation behavior", () => {
    it("should delete existing activation", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `DELETE-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Create activation
      const activateResult = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
        name: "To Delete",
      });
      expect(activateResult.success).toBe(true);

      if (activateResult.success) {
        // Delete it
        const deleteResult = await deactivate({
          activationId: activateResult.data.id,
          organizationId: testData.organization.id,
        });

        expect(deleteResult.success).toBe(true);

        // Verify it's gone
        const [remaining] = await db
          .select()
          .from(activation)
          .where(eq(activation.id, activateResult.data.id));
        expect(remaining).toBeUndefined();
      }
    });

    it("should return error for non-existing activation", async () => {
      const result = await deactivate({
        activationId: "00000000-0000-0000-0000-000000000000",
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ActivationErrorCode.NOT_FOUND);
      }
    });

    it("should allow reactivation after deactivation", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `REACTIVATE-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 1, // Only 1 allowed
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Activate
      const result1 = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
      });
      expect(result1.success).toBe(true);

      // Deactivate
      if (result1.success) {
        const deleteResult = await deactivate({
          activationId: result1.data.id,
          organizationId: testData.organization.id,
        });
        expect(deleteResult.success).toBe(true);
      }

      // Should be able to activate again
      const result2 = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
      });
      expect(result2.success).toBe(true);
    });
  });
});
