import { expect, test, describe } from "vitest";
import { db } from "../db/config.server";
import { eq } from "drizzle-orm";
import { licenseSchema, licensePolicySchema, secretKeySchema } from "../db/schema.server";
import invariant from "tiny-invariant";
import { factory } from "../factory";
import {
  createActivation,
  createLicense,
  createLicensePolicy,
  createProductFromStripe,
  getOrCreateCustomer,
  deleteActivation,
} from "../models";
import { licenseStatusEnum, licenseTypeEnum } from "../types";
import { nanoid } from "../db/config.server";
import { getTableName } from "drizzle-orm";

describe("License State Transitions - Activation Logic", () => {
  describe("License Creation States", () => {
    test("creates license as INACTIVE when policy has activationLimit", async () => {
      const { team, product, secretKey } = await factory();

      const customer = await getOrCreateCustomer({
        name: "Test Customer",
        email: "test@example.com",
      });

      const license = await createLicense({
        productId: product.id,
        teamId: team.id,
        customerId: customer.id,
        secretKey,
      });

      expect(license.status).toBe(licenseStatusEnum.inactive);
      expect(license.activationLimit).toBe(1); // factory sets this
    });

    test("creates license as ACTIVE when policy has no activationLimit", async () => {
      const { team } = await factory();

      // Create product without activation limit
      const product = await createProductFromStripe({
        name: "unlimited-product",
        teamId: team.id,
        description: "product with unlimited activations",
        stripeProductId: `${nanoid("prod_")}`,
      });

      // Create policy without activation limit
      await createLicensePolicy({
        productId: product.id,
        type: licenseTypeEnum.restrict,
        licenseLength: 365,
        activationLimit: null, // no limit
      });

      const secretKey = (
        await db.query.secretKeySchema.findFirst({
          columns: { secretKey: true },
          where: eq(secretKeySchema.teamId, team.id),
        })
      )?.secretKey;

      invariant(secretKey);

      const customer = await getOrCreateCustomer({
        name: "Test Customer",
        email: "test2@example.com",
      });

      const license = await createLicense({
        productId: product.id,
        teamId: team.id,
        customerId: customer.id,
        secretKey,
      });

      expect(license.status).toBe(licenseStatusEnum.active);
      expect(license.activationLimit).toBeNull();
    });
  });

  describe("First Activation Transition (INACTIVE → ACTIVE)", () => {
    test("transitions license from INACTIVE to ACTIVE on first activation", async () => {
      const { license, team } = await factory();

      // Verify license starts as INACTIVE
      const initialLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });
      expect(initialLicense?.status).toBe(licenseStatusEnum.inactive);

      // Create first activation
      const { activated, activation, error } = await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });

      expect(activated).toBe(true);
      expect(error).toBeNull();
      expect(activation).toBeDefined();

      // Verify license transitioned to ACTIVE
      const activeLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });
      expect(activeLicense?.status).toBe(licenseStatusEnum.active);
    });

    test("only transitions when license has activationLimit", async () => {
      const { team } = await factory();

      // Create product and policy without activation limit
      const product = await createProductFromStripe({
        name: "unlimited-product",
        teamId: team.id,
        description: "product with unlimited activations",
        stripeProductId: `${nanoid("prod_")}`,
      });

      await createLicensePolicy({
        productId: product.id,
        type: licenseTypeEnum.restrict,
        licenseLength: 365,
        activationLimit: null,
      });

      const secretKey = (
        await db.query.secretKeySchema.findFirst({
          columns: { secretKey: true },
          where: eq(secretKeySchema.teamId, team.id),
        })
      )?.secretKey;

      invariant(secretKey);

      const customer = await getOrCreateCustomer({
        name: "Test Customer",
        email: "test3@example.com",
      });

      const license = await createLicense({
        productId: product.id,
        teamId: team.id,
        customerId: customer.id,
        secretKey,
      });

      // License should already be ACTIVE (no activation limit)
      expect(license.status).toBe(licenseStatusEnum.active);

      // Create activation - should stay ACTIVE
      const { activated, error } = await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });

      expect(activated).toBe(true);
      expect(error).toBeNull();

      const finalLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });
      expect(finalLicense?.status).toBe(licenseStatusEnum.active);
    });
  });

  describe("Multiple Activations", () => {
    test("can create multiple activations up to the limit", async () => {
      const { team } = await factory();

      // Create product with higher activation limit
      const product = await createProductFromStripe({
        name: "multi-activation-product",
        teamId: team.id,
        description: "product with multiple activations",
        stripeProductId: `${nanoid("prod_")}`,
      });

      await createLicensePolicy({
        productId: product.id,
        type: licenseTypeEnum.restrict,
        licenseLength: 365,
        activationLimit: 5,
      });

      const secretKey = (
        await db.query.secretKeySchema.findFirst({
          columns: { secretKey: true },
          where: eq(secretKeySchema.teamId, team.id),
        })
      )?.secretKey;

      invariant(secretKey);

      const customer = await getOrCreateCustomer({
        name: "Test Customer",
        email: "test4@example.com",
      });

      const license = await createLicense({
        productId: product.id,
        teamId: team.id,
        customerId: customer.id,
        secretKey,
      });

      // Create 3 activations
      for (let i = 1; i <= 3; i++) {
        const { activated, error } = await createActivation({
          licenseId: license.id,
          name: `Device ${i}`,
        });
        expect(activated).toBe(true);
        expect(error).toBeNull();
      }

      // Verify license has 3 activations
      const licenseFinal = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
        with: { activations: true },
      });

      expect(licenseFinal?.activations).toHaveLength(3);
      expect(licenseFinal?.status).toBe(licenseStatusEnum.active);
    });

    test("prevents activation when limit is reached", async () => {
      const { license } = await factory(); // factory creates with limit: 1

      // Create first activation - succeeds, transitions to ACTIVE
      const { activated: firstActivated, error: firstError } =
        await createActivation({
          licenseId: license.id,
          name: "Device 1",
        });

      expect(firstActivated).toBe(true);
      expect(firstError).toBeNull();

      // Try to create second activation - should fail
      const { activated: secondActivated, error: secondError } =
        await createActivation({
          licenseId: license.id,
          name: "Device 2",
        });

      expect(secondActivated).toBe(false);
      expect(secondError).toBe("Activation limit reached");
    });
  });

  describe("Last Activation Deletion (GAP #1) - Expected Behavior", () => {
    test("deleting last activation should revert license from ACTIVE to INACTIVE", async () => {
      const { license } = await factory();

      // Create activation - transitions to ACTIVE
      const { activation, activated } = await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });

      expect(activated).toBe(true);
      invariant(activation);

      // Verify license is ACTIVE with 1 activation
      let activeLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
        with: { activations: true },
      });

      expect(activeLicense?.status).toBe(licenseStatusEnum.active);
      expect(activeLicense?.activations).toHaveLength(1);

      // Delete the activation using the new deleteActivation function
      const { deleted, error } = await deleteActivation(activation.id);
      expect(deleted).toBe(true);
      expect(error).toBeNull();

      // Check license state after deletion
      const deletedLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
        with: { activations: true },
      });

      expect(deletedLicense?.activations).toHaveLength(0);

      // After the fix, license should be INACTIVE
      expect(deletedLicense?.status).toBe(licenseStatusEnum.inactive);
    });

    test("deleting non-last activation should keep license ACTIVE", async () => {
      const { team } = await factory();

      // Create product with 3 activation limit
      const product = await createProductFromStripe({
        name: "multi-activation",
        teamId: team.id,
        description: "test",
        stripeProductId: `${nanoid("prod_")}`,
      });

      await createLicensePolicy({
        productId: product.id,
        type: licenseTypeEnum.restrict,
        licenseLength: 365,
        activationLimit: 3,
      });

      const secretKey = (
        await db.query.secretKeySchema.findFirst({
          columns: { secretKey: true },
          where: eq(secretKeySchema.teamId, team.id),
        })
      )?.secretKey;

      invariant(secretKey);

      const customer = await getOrCreateCustomer({
        name: "Test Customer",
        email: "test5@example.com",
      });

      const license = await createLicense({
        productId: product.id,
        teamId: team.id,
        customerId: customer.id,
        secretKey,
      });

      // Create 2 activations
      const activation1 = await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });
      invariant(activation1.activation);

      const activation2 = await createActivation({
        licenseId: license.id,
        name: "Device 2",
      });
      invariant(activation2.activation);

      // Delete first activation
      await deleteActivation(activation1.activation.id);

      // Verify license still ACTIVE with 1 remaining activation
      const licenseFinal = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
        with: { activations: true },
      });

      expect(licenseFinal?.status).toBe(licenseStatusEnum.active);
      expect(licenseFinal?.activations).toHaveLength(1);
    });

    test("SCENARIO: Create activation, delete it, create new one - should handle state correctly", async () => {
      const { license } = await factory();

      // 1. Create first activation - INACTIVE → ACTIVE
      const activation1 = await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });
      invariant(activation1.activation);

      let licenseState = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
        with: { activations: true },
      });
      expect(licenseState?.status).toBe(licenseStatusEnum.active);

      // 2. Delete activation - ACTIVE → INACTIVE (with fix)
      await deleteActivation(activation1.activation.id);

      licenseState = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
        with: { activations: true },
      });

      // After the fix, should be INACTIVE
      expect(licenseState?.status).toBe(licenseStatusEnum.inactive);

      // 3. Create new activation - should succeed if license is INACTIVE
      // If license stayed ACTIVE and still has a "used" slot, this might fail
      const activation2 = await createActivation({
        licenseId: license.id,
        name: "Device 2",
      });

      // This test validates the complete cycle
      expect(activation2.activated).toBe(true);
    });
  });

  describe("Manual Activation/Deactivation (Dashboard Actions)", () => {
    test("can manually deactivate an ACTIVE license", async () => {
      const { license } = await factory();

      // Create activation - transitions to ACTIVE
      await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });

      let activeLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });
      expect(activeLicense?.status).toBe(licenseStatusEnum.active);

      // Manual deactivate
      await db
        .update(licenseSchema)
        .set({ status: licenseStatusEnum.inactive })
        .where(eq(licenseSchema.id, license.id));

      const inactiveLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });
      expect(inactiveLicense?.status).toBe(licenseStatusEnum.inactive);
    });

    test("can manually activate an INACTIVE license", async () => {
      const { license } = await factory();

      // License starts INACTIVE
      expect(license.status).toBe(licenseStatusEnum.inactive);

      // Manual activate
      await db
        .update(licenseSchema)
        .set({ status: licenseStatusEnum.active })
        .where(eq(licenseSchema.id, license.id));

      const activeLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });
      expect(activeLicense?.status).toBe(licenseStatusEnum.active);
    });

    test("manual reactivate with activationLimit and no activations should reconsider state", async () => {
      const { license } = await factory();

      // Create and delete activation - license should be INACTIVE (with fix)
      const activation = await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });
      invariant(activation.activation);

      // Manually deactivate
      await db
        .update(licenseSchema)
        .set({ status: licenseStatusEnum.inactive })
        .where(eq(licenseSchema.id, license.id));

      let licenseState = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });
      expect(licenseState?.status).toBe(licenseStatusEnum.inactive);

      // Delete the activation - should transition to INACTIVE
      await deleteActivation(activation.activation.id);

      licenseState = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
        with: { activations: true },
      });
      expect(licenseState?.activations).toHaveLength(0);
      expect(licenseState?.status).toBe(licenseStatusEnum.inactive);

      // Now manually activate
      await db
        .update(licenseSchema)
        .set({ status: licenseStatusEnum.active })
        .where(eq(licenseSchema.id, license.id));

      const finalLicense = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });

      // Manual activation sets status to ACTIVE regardless of activations
      // (This is the current behavior - manual activation doesn't validate activations)
      expect(finalLicense?.status).toBe(licenseStatusEnum.active);
    });
  });

  describe("Edge Cases", () => {
    test("cannot create activation on DISABLED license", async () => {
      const { license } = await factory();

      // Disable license
      await db
        .update(licenseSchema)
        .set({ status: licenseStatusEnum.disabled })
        .where(eq(licenseSchema.id, license.id));

      // Try to create activation
      const { activated, error } = await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });

      expect(activated).toBe(false);
      expect(error).toBe("License is disabled");
    });

    test("license status persists correctly across multiple queries", async () => {
      const { license } = await factory();

      // Create activation
      await createActivation({
        licenseId: license.id,
        name: "Device 1",
      });

      // Query multiple times
      const query1 = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });

      const query2 = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, license.id),
      });

      expect(query1?.status).toBe(query2?.status);
      expect(query1?.status).toBe(licenseStatusEnum.active);
    });
  });
});
