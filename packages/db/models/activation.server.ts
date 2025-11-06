import { eq } from "drizzle-orm";
import { db, nanoid } from "../db/config.server";
import { activationsSchema, licenseSchema } from "../db/schema.server";
import { getTableName } from "drizzle-orm";
import { apiErrorsEnum, licenseStatusEnum } from "../types";

export async function createActivation({
  licenseId,
  name,
}: {
  licenseId: string;
  name: string;
}) {
  const license = await db.query.licenseSchema.findFirst({
    where: eq(licenseSchema.id, licenseId),
    with: { activations: true },
  });

  if (!license) {
    return {
      activated: false,
      error: apiErrorsEnum.noLicenseFound,
    };
  }

  if (license.status === "DISABLED") {
    return {
      activated: false,
      error: apiErrorsEnum.licenseDisabled,
    };
  }

  if (
    license.activationLimit &&
    license.activations.length >= license.activationLimit
  ) {
    return {
      activated: false,
      error: apiErrorsEnum.activationLimitReached,
    };
  }

  if (
    license?.status === licenseStatusEnum.inactive &&
    license.activationLimit
  ) {
    await db
      .update(licenseSchema)
      .set({ status: licenseStatusEnum.active })
      .where(eq(licenseSchema.id, licenseId));
  }

  const activation = (
    await db
      .insert(activationsSchema)
      .values([
        {
          id: nanoid(getTableName(activationsSchema)),
          name,
          licenseId,
          teamId: license.teamId,
        },
      ])
      .returning()
      .execute()
  )[0];

  return { activated: true, error: null, activation };
}
