import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/db/db";
import {
  organization,
  product,
  customer,
  license,
  activation,
  licensePolicy,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  findLicense,
  checkLicenseState,
  checkActivationLimit,
  validateLicense,
  activateLicense,
  deactivate,
  LicenseErrorCode,
  ActivationErrorCode,
} from "../license";

// ============================================
// Test Setup
// ============================================

interface TestData {
  organization: typeof organization.$inferSelect;
  product: typeof product.$inferSelect;
  customer: typeof customer.$inferSelect;
  license: typeof license.$inferSelect;
}

let testCounter = 0;

async function createTestData(): Promise<TestData> {
  testCounter++;
  const suffix = `${Date.now()}-${testCounter}`;

  const [org] = await db
    .insert(organization)
    .values({
      name: `Test Org ${suffix}`,
      slug: `test-org-${suffix}`,
      apiKey: `pub_test_${suffix}`,
      isOnboarded: true,
    })
    .returning();

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
      email: `test-${suffix}@example.com`,
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

  return { organization: org, product: prod, customer: cust, license: lic };
}

async function cleanupTestData(testData: TestData) {
  await db.delete(activation).where(eq(activation.organizationId, testData.organization.id));
  await db.delete(license).where(eq(license.organizationId, testData.organization.id));
  await db.delete(licensePolicy).where(eq(licensePolicy.productId, testData.product.id));
  await db.delete(customer).where(eq(customer.organizationId, testData.organization.id));
  await db.delete(product).where(eq(product.organizationId, testData.organization.id));
  await db.delete(organization).where(eq(organization.id, testData.organization.id));
}

async function createExpiredLicense(testData: TestData) {
  const [lic] = await db
    .insert(license)
    .values({
      key: `EXPIRED-${Date.now()}`,
      keyCreatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      status: "active",
      expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
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

async function createPerpetualLicense(testData: TestData) {
  const [lic] = await db
    .insert(license)
    .values({
      key: `PERPETUAL-${Date.now()}`,
      keyCreatedAt: new Date(),
      status: "active",
      expiresAt: null, // Perpetual - never expires
      activationLimit: 5,
      productId: testData.product.id,
      customerId: testData.customer.id,
      organizationId: testData.organization.id,
    })
    .returning();
  return lic;
}

async function createActivationRecord(licenseId: string, organizationId: string, name?: string) {
  const [act] = await db
    .insert(activation)
    .values({
      name: name ?? "Test Device",
      licenseId,
      organizationId,
    })
    .returning();
  return act;
}

// ============================================
// Tests
// ============================================

describe("Core License Service", () => {
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
  // findLicense
  // ==========================================

  describe("findLicense", () => {
    it("should find an existing license", async () => {
      const result = await findLicense(testData.license.id, testData.organization.id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(testData.license.id);
        expect(result.data.key).toBe(testData.license.key);
      }
    });

    it("should return NOT_FOUND for non-existing license", async () => {
      const result = await findLicense(
        "00000000-0000-0000-0000-000000000000",
        testData.organization.id
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.NOT_FOUND);
      }
    });

    it("should return NOT_FOUND for license from different organization", async () => {
      const result = await findLicense(testData.license.id, testData2.organization.id);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.NOT_FOUND);
      }
    });
  });

  // ==========================================
  // checkLicenseState
  // ==========================================

  describe("checkLicenseState", () => {
    it("should return success for active license", async () => {
      const result = checkLicenseState(testData.license);

      expect(result.success).toBe(true);
    });

    it("should return DISABLED for disabled license", async () => {
      const disabledLicense = await createDisabledLicense(testData);
      const result = checkLicenseState(disabledLicense);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.DISABLED);
        expect(result.disabledReason).toBe("customer_request");
      }
    });

    it("should return EXPIRED for expired license", async () => {
      const expiredLicense = await createExpiredLicense(testData);
      const result = checkLicenseState(expiredLicense);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.EXPIRED);
      }
    });

    it("should return success for perpetual license (null expiresAt)", async () => {
      const perpetualLicense = await createPerpetualLicense(testData);
      const result = checkLicenseState(perpetualLicense);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================
  // checkActivationLimit
  // ==========================================

  describe("checkActivationLimit", () => {
    it("should allow activation when under limit", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `LIMIT-TEST-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 3,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Add 1 activation (under limit of 3)
      await createActivationRecord(freshLicense.id, testData.organization.id);

      const result = await checkActivationLimit(freshLicense);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentCount).toBe(1);
      }
    });

    it("should reject when activation limit is reached", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `LIMIT-FULL-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 2,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Add 2 activations (at limit of 2)
      await createActivationRecord(freshLicense.id, testData.organization.id, "Device 1");
      await createActivationRecord(freshLicense.id, testData.organization.id, "Device 2");

      const result = await checkActivationLimit(freshLicense);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.ACTIVATION_LIMIT_REACHED);
      }
    });

    it("should allow unlimited activations when limit is null", async () => {
      const [unlimitedLicense] = await db
        .insert(license)
        .values({
          key: `UNLIMITED-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: null, // Unlimited
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Add many activations
      for (let i = 0; i < 10; i++) {
        await createActivationRecord(unlimitedLicense.id, testData.organization.id, `Device ${i}`);
      }

      const result = await checkActivationLimit(unlimitedLicense);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentCount).toBe(10);
      }
    });
  });

  // ==========================================
  // validateLicense
  // ==========================================

  describe("validateLicense", () => {
    it("should validate a valid license", async () => {
      const result = await validateLicense({
        licenseId: testData.license.id,
        key: testData.license.key,
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(testData.license.id);
        expect(result.data.key).toBe(testData.license.key);
        expect(result.data.activationLimit).toBe(testData.license.activationLimit);
      }
    });

    it("should return NOT_FOUND for non-existing license", async () => {
      const result = await validateLicense({
        licenseId: "00000000-0000-0000-0000-000000000000",
        key: "ANY-KEY",
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.NOT_FOUND);
      }
    });

    it("should return INVALID_KEY for wrong key", async () => {
      const result = await validateLicense({
        licenseId: testData.license.id,
        key: "WRONG-KEY",
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.INVALID_KEY);
      }
    });

    it("should return DISABLED for disabled license", async () => {
      const disabledLicense = await createDisabledLicense(testData);

      const result = await validateLicense({
        licenseId: disabledLicense.id,
        key: disabledLicense.key,
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.DISABLED);
        expect(result.disabledReason).toBe("customer_request");
      }
    });

    it("should return EXPIRED for expired license", async () => {
      const expiredLicense = await createExpiredLicense(testData);

      const result = await validateLicense({
        licenseId: expiredLicense.id,
        key: expiredLicense.key,
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.EXPIRED);
      }
    });
  });

  // ==========================================
  // activateLicense
  // ==========================================

  describe("activateLicense", () => {
    it("should activate a valid license", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `ACTIVATE-${Date.now()}`,
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
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.licenseId).toBe(freshLicense.id);
        expect(result.data.name).toBe("My Device");
        expect(result.data.organizationId).toBe(testData.organization.id);
      }
    });

    it("should activate with machineId", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `MACHINE-${Date.now()}`,
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
        machineId: "ABC123-MACHINE-ID",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.machineId).toBe("ABC123-MACHINE-ID");
      }
    });

    it("should return NOT_FOUND for non-existing license", async () => {
      const result = await activateLicense({
        licenseId: "00000000-0000-0000-0000-000000000000",
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.NOT_FOUND);
      }
    });

    it("should return DISABLED for disabled license", async () => {
      const disabledLicense = await createDisabledLicense(testData);

      const result = await activateLicense({
        licenseId: disabledLicense.id,
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.DISABLED);
      }
    });

    it("should return EXPIRED for expired license", async () => {
      const expiredLicense = await createExpiredLicense(testData);

      const result = await activateLicense({
        licenseId: expiredLicense.id,
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LicenseErrorCode.EXPIRED);
      }
    });

    it("should return ACTIVATION_LIMIT_REACHED when limit exceeded", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `LIMIT-EXCEED-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 1,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // First activation should succeed
      const result1 = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
        name: "Device 1",
      });
      expect(result1.success).toBe(true);

      // Second activation should fail (limit is 1)
      const result2 = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
        name: "Device 2",
      });

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toBe(LicenseErrorCode.ACTIVATION_LIMIT_REACHED);
      }
    });

    it("should allow activation on perpetual license", async () => {
      const perpetualLicense = await createPerpetualLicense(testData);

      const result = await activateLicense({
        licenseId: perpetualLicense.id,
        organizationId: testData.organization.id,
        name: "Perpetual Device",
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================
  // deactivate
  // ==========================================

  describe("deactivate", () => {
    it("should deactivate an existing activation", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `DEACTIVATE-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const act = await createActivationRecord(freshLicense.id, testData.organization.id);

      const result = await deactivate({
        activationId: act.id,
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(act.id);
      }

      // Verify it's actually deleted
      const [remaining] = await db
        .select()
        .from(activation)
        .where(eq(activation.id, act.id));
      expect(remaining).toBeUndefined();
    });

    it("should return NOT_FOUND for non-existing activation", async () => {
      const result = await deactivate({
        activationId: "00000000-0000-0000-0000-000000000000",
        organizationId: testData.organization.id,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ActivationErrorCode.NOT_FOUND);
      }
    });

    it("should return NOT_FOUND for activation from different organization", async () => {
      const [freshLicense] = await db
        .insert(license)
        .values({
          key: `CROSS-ORG-${Date.now()}`,
          keyCreatedAt: new Date(),
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          activationLimit: 5,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      const act = await createActivationRecord(freshLicense.id, testData.organization.id);

      // Try to deactivate from different org
      const result = await deactivate({
        activationId: act.id,
        organizationId: testData2.organization.id,
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
          activationLimit: 1,
          productId: testData.product.id,
          customerId: testData.customer.id,
          organizationId: testData.organization.id,
        })
        .returning();

      // Activate
      const activateResult = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
      });
      expect(activateResult.success).toBe(true);

      // Deactivate
      if (activateResult.success) {
        const deactivateResult = await deactivate({
          activationId: activateResult.data.id,
          organizationId: testData.organization.id,
        });
        expect(deactivateResult.success).toBe(true);
      }

      // Reactivate should work
      const reactivateResult = await activateLicense({
        licenseId: freshLicense.id,
        organizationId: testData.organization.id,
      });
      expect(reactivateResult.success).toBe(true);
    });
  });
});
