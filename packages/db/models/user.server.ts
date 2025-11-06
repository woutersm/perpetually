import { db, nanoid } from "../db/config.server";
import { userSchema } from "../db/schema.server";
import { getTableName } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function createUser({
  email,
  name,
  password,
  teamId,
}: {
  email: string;
  name: string;
  password: string;
  teamId: string;
}) {
  const passwordHash = bcrypt.hashSync(password, 10);

  return (
    await db
      .insert(userSchema)
      .values([
        {
          id: nanoid(getTableName(userSchema)),
          name,
          email,
          teamId,
          passwordHash,
        },
      ])
      .returning()
      .execute()
  )[0];
}
