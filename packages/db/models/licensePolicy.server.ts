import { eq } from "drizzle-orm";
import { db } from "../db/config.server";
import { licensePolicySchema, productSchema } from "../db/schema.server";

export async function createLicensePolicy({
  productId,
  type,
  activationLimit,
  licenseLength,
}: {
  productId: string;
  type: string;
  activationLimit: number | undefined;
  licenseLength: number | undefined;
}) {
  await db.transaction(async (tx: any) => {
    const existingPolicy = await tx.query.licensePolicySchema.findFirst({
      where: eq(licensePolicySchema.productId, productId),
    });

    if (existingPolicy) {
      await tx
        .update(licensePolicySchema)
        .set({ type, activationLimit, licenseLength })
        .where(eq(licensePolicySchema.id, existingPolicy.id));
    } else {
      await tx.insert(licensePolicySchema).values({
        id: crypto.randomUUID(),
        type,
        licenseLength: licenseLength ?? 0,
        activationLimit: activationLimit ?? null,
        productId,
      });
    }

    await tx
      .update(productSchema)
      .set({
        status: "ACTIVE",
      })
      .where(eq(productSchema.id, productId));
  });
}
