import { db, nanoid } from "../db/config.server";
import { customerSchema } from "../db/schema.server";
import { eq, getTableName } from "drizzle-orm";

export async function createCustomer({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  return (
    await db
      .insert(customerSchema)
      .values([
        {
          id: nanoid(getTableName(customerSchema)),
          name,
          email,
        },
      ])
      .returning()
      .execute()
  )[0];
}

export async function getOrCreateCustomer({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const existingCustomer = await db.query.customerSchema.findFirst({
    where: eq(customerSchema.email, email),
  });

  if (existingCustomer) {
    return existingCustomer;
  }

  const customer = await createCustomer({ name, email });

  return customer;
}
