import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import invariant from "tiny-invariant";
import { db, nanoid } from "../db/config.server";
import {
  License,
  licenseSchema,
  productSchema,
  teamSchema,
} from "../db/schema.server";
import { eq, getTableName, and } from "drizzle-orm";
import { add, isWithinInterval } from "date-fns";
import { toSQLiteTimestamp } from "../lib/utils";
import { apiErrorsEnum, licenseStatusEnum } from "../types";
import bs58 from "bs58";
import consola from "consola";
import { getOrCreateCustomer } from "./customer.server";

// the IV needs to have a size of 16 bytes, we are only using the first 8
// and are padding the last 8 to reduce encoded key length
const IV_SIZE = 8; // 8 bytes for initialization vector
const IV_PADDING_SIZE = 8; // 8 bytes padded for initialization vector
const LICENSE_ID_SIZE = 16; // 16 characters for license ID
const TOTAL_BYTES = IV_SIZE + LICENSE_ID_SIZE; // 24 bytes total

// 1 in the ~50 tries results in a 32 length key do the the bs58 encoding
// we want a stable key size so rerunning the key generation when the key
// is not of length 33
const EXPECTED_KEY_LENGTH = 33;

export async function createLicenseAction({
  teamId,
  name,
  email,
  stripeProductId,
}: {
  teamId: string;
  email: string;
  name: string;
  stripeProductId: string;
}) {
  const team = await db.query.teamSchema.findFirst({
    where: eq(teamSchema.id, teamId),
    with: { secretKeys: true },
  });

  invariant(team?.secretKeys?.secretKey, "no secretKey");

  const product = await db.query.productSchema.findFirst({
    where: and(
      eq(productSchema.stripeProductId, stripeProductId),
      eq(productSchema.teamId, teamId)
    ),
    with: {
      licensePolicies: true,
    },
  });

  if (!product) {
    return {
      created: false,
      error: apiErrorsEnum.noProductFound,
      license: undefined,
    };
  }

  if (!product.licensePolicies?.[0]) {
    return {
      created: false,
      error: "No license policy found for product",
      license: undefined,
    };
  }

  const customer = await getOrCreateCustomer({ name, email });

  const license = await createLicense({
    teamId,
    productId: product.id,
    customerId: customer.id,
    secretKey: team?.secretKeys?.secretKey,
  });

  return {
    created: true,
    error: null,
    license,
  };
}

export async function createLicense({
  productId,
  teamId,
  customerId,
  secretKey,
}: {
  productId: string;
  teamId: string;
  customerId: string;
  secretKey: string;
}) {
  const id = nanoid(getTableName(licenseSchema));
  const key = generateKey(id, secretKey);
  const keyCreatedAt = toSQLiteTimestamp(new Date());

  const product = await db.query.productSchema.findFirst({
    where: eq(productSchema.id, productId),
    with: {
      licensePolicies: true,
    },
  });

  invariant(product, "no product in createLicense");
  invariant(product.licensePolicies?.[0], "no license policy in createLicense");

  const policy = product.licensePolicies[0];
  const expiresAt = toSQLiteTimestamp(
    add(new Date(), { days: policy.licenseLength })
  );

  const status = policy.activationLimit
    ? licenseStatusEnum.inactive
    : licenseStatusEnum.active;

  const license = (
    await db
      .insert(licenseSchema)
      .values([
        {
          id,
          productId,
          teamId,
          customerId,
          expiresAt,
          key,
          keyCreatedAt,
          status,
          activationLimit: policy.activationLimit,
        },
      ])
      .returning()
      .execute()
  )[0];

  return license;
}

export async function generateNewLicenseKey({
  licenseId,
  secretKey,
}: {
  licenseId: string;
  secretKey: string;
}) {
  const key = generateKey(licenseId, secretKey);
  const keyCreatedAt = toSQLiteTimestamp(new Date());

  await db
    .update(licenseSchema)
    .set({ key, keyCreatedAt })
    .where(eq(licenseSchema.id, licenseId));
}

export function validateKeyAndGetLicenseId(
  key: string,
  secretKey: string
): string | null {
  try {
    const combined = bs58.decode(key);

    if (combined.length !== TOTAL_BYTES) {
      throw new Error("Invalid decoded key length");
    }

    const iv = combined.slice(0, IV_SIZE);
    const data = combined.slice(IV_SIZE);

    const paddedIV = Buffer.concat([iv, Buffer.alloc(IV_PADDING_SIZE)]);

    const decipher = createDecipheriv(
      "aes-256-ctr",
      Buffer.from(secretKey, "hex"),
      paddedIV
    );

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    const licenseId = decrypted.toString("utf8", 0, LICENSE_ID_SIZE);
    return licenseId.length === LICENSE_ID_SIZE ? licenseId : null;
  } catch (error) {
    consola.error("error in validating the key: ", { error, key });

    return null;
  }
}

function generateKey(licenseId: string, secretKey: string): string {
  let encoded: string;

  do {
    const initializationVector = randomBytes(IV_SIZE);
    const paddedIV = Buffer.concat([
      initializationVector,
      Buffer.alloc(IV_PADDING_SIZE),
    ]);
    const cipher = createCipheriv(
      "aes-256-ctr",
      Buffer.from(secretKey, "hex"),
      paddedIV
    );
    const encrypted = Buffer.concat([
      cipher.update(licenseId, "utf8"),
      cipher.final(),
    ]);
    const combined = Buffer.concat([
      initializationVector,
      encrypted.slice(0, LICENSE_ID_SIZE),
    ]);
    encoded = bs58.encode(combined);
  } while (encoded.length !== EXPECTED_KEY_LENGTH);

  return encoded;
}

export async function isLicenseValid({
  license,
  key,
  secretKey,
}: {
  license: License;
  key: string;
  secretKey: string;
}) {
  if (license.key !== key) {
    return { valid: false, error: apiErrorsEnum.keyInvalid };
  }

  const licenseIdFromKey = validateKeyAndGetLicenseId(key, secretKey);

  if (!licenseIdFromKey) {
    return { valid: false, error: apiErrorsEnum.keyInvalid };
  }

  const isDisabled = license.status === licenseStatusEnum.disabled;

  if (isDisabled) {
    return { valid: false, error: apiErrorsEnum.licenseDisabled };
  }

  const isExpired = license.status === licenseStatusEnum.expired;

  if (isExpired) {
    return {
      valid: false,
      error: apiErrorsEnum.licenseExpired,
    };
  }

  const isInRange = isWithinInterval(new Date(), {
    start: license.createdAt,
    end: new Date(license.expiresAt),
  });

  if (!isInRange) {
    return { valid: false, error: apiErrorsEnum.licenseExpired };
  }

  return { valid: true, error: null };
}

export async function disableLicense(licenseId: string) {
  await db
    .update(licenseSchema)
    .set({ status: "DISABLED" })
    .where(eq(licenseSchema.id, licenseId));
}

// TODO: test for activatelicense and the right state
export async function activateLicense(licenseId: string) {
  await db
    .update(licenseSchema)
    .set({ status: "ACTIVE" })
    .where(eq(licenseSchema.id, licenseId));
}
