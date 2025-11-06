import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { db, nanoid } from "./db/config.server";
import { secretKeySchema } from "./db/schema.server";
import { getOrCreateCustomer } from "./models";
import { createLicense } from "./models";
import { createLicensePolicy } from "./models";
import { createProductFromStripe } from "./models";
import { createTeam } from "./models";
import { licenseTypeEnum } from "./types";

export async function factory() {
  const team = await createTeam("team");

  const secretKey = (
    await db.query.secretKeySchema.findFirst({
      columns: { secretKey: true },
      where: eq(secretKeySchema.teamId, team.id),
    })
  )?.secretKey;

  invariant(secretKey);

  const product = await createProductFromStripe({
    name: "product",
    teamId: team.id,
    description: "product description",
    stripeProductId: `${nanoid("prod_")}`,
  });

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const email = faker.internet.email({ firstName, lastName });
  const name = faker.person.fullName({ firstName, lastName });

  const customer = await getOrCreateCustomer({
    name,
    email,
  });

  await createLicensePolicy({
    productId: product.id,
    type: licenseTypeEnum.restrict,
    licenseLength: 365,
    activationLimit: 1,
  });

  const license = await createLicense({
    productId: product.id,
    teamId: team.id,
    customerId: customer.id,
    secretKey,
  });

  return {
    team,
    product,
    customer,
    license,
    secretKey,
  };
}
