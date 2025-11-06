import { expect, test } from "vitest";
import { db } from "@perpetually/db/config";
import { eq } from "drizzle-orm";
import { productSchema } from "@perpetually/db/schema";
import { createProductFromStripe } from "@perpetually/db/models";
import { createLicensePolicy } from "@perpetually/db/models";
import { createTeam } from "@perpetually/db/models";
import { licenseTypeEnum } from "@perpetually/db/types";
import { nanoid } from "@perpetually/db/config";

test("product becomes active after creating license policy", async () => {
  // Create a team
  const team = await createTeam("test-team");

  // Create a product
  const product = await createProductFromStripe({
    name: "test-product",
    teamId: team.id,
    description: "test description",
    stripeProductId: `${nanoid("prod_")}`,
  });

  // Verify product is initially pending
  expect(product.status).toBe("PENDING");

  // Create a license policy
  await createLicensePolicy({
    productId: product.id,
    type: licenseTypeEnum.restrict,
    licenseLength: 365,
    activationLimit: 1,
  });

  // Fetch the updated product
  const updatedProduct = await db.query.productSchema.findFirst({
    where: eq(productSchema.id, product.id),
  });

  // Verify product is now active
  expect(updatedProduct?.status).toBe("ACTIVE");
});
