import { expect, test } from "vitest";
import { db } from "../db/config.server";
import { eq } from "drizzle-orm";
import { licenseSchema, licensePolicySchema } from "../db/schema.server";
import invariant from "tiny-invariant";
import { factory } from "../factory";
import {
  generateNewLicenseKey,
  isLicenseValid,
  validateKeyAndGetLicenseId,
} from "@perpetually/db/models";

test("generate valid license", async () => {
  const { team, license, product, secretKey } = await factory();

  expect(license.id.length).toBe(16);
  expect(license.productId.length).toBe(16);
  expect(license.productId).toBe(product.id);
  expect(license.teamId.length).toBe(16);
  expect(license.teamId).toBe(team.id);
  expect(license.key.length).toBe(33);

  const licenseId = validateKeyAndGetLicenseId(license.key, secretKey);
  expect(licenseId).toBe(license.id);
});

test("generate new key", async () => {
  const { license, secretKey } = await factory();

  const isInitialLicenseValid = await isLicenseValid({
    license,
    key: license.key,
    secretKey,
  });

  expect(isInitialLicenseValid).toEqual({ error: null, valid: true });

  await generateNewLicenseKey({ licenseId: license.id, secretKey });

  const licenseWithNewKey = await db.query.licenseSchema.findFirst({
    where: eq(licenseSchema.id, license.id),
  });

  invariant(licenseWithNewKey);

  expect(license.id).toBe(licenseWithNewKey.id);
  expect(license.key).not.toBe(licenseWithNewKey.key);

  const isNewLicenseValid = await isLicenseValid({
    license: licenseWithNewKey,
    key: licenseWithNewKey.key,
    secretKey,
  });

  expect(isNewLicenseValid).toEqual({ error: null, valid: true });
});

test("license policy is created with product", async () => {
  const { product } = await factory();

  const licensePolicy = await db.query.licensePolicySchema.findFirst({
    where: eq(licensePolicySchema.productId, product.id),
  });

  expect(licensePolicy).toBeDefined();
  expect(licensePolicy?.productId).toBe(product.id);
  expect(licensePolicy?.type).toBe("RESTRICT");
  expect(licensePolicy?.licenseLength).toBe(365);
  expect(licensePolicy?.activationLimit).toBe(1);
});
