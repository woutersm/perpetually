import { db, nanoid } from "../db/config.server";
import { releaseSchema } from "../db/schema.server";
import { getTableName } from "drizzle-orm";

export async function createRelease({
  productId,
  tag,
  description,
}: {
  productId: string;
  tag: string;
  description?: string;
}) {
  return (
    await db
      .insert(releaseSchema)
      .values([
        {
          id: nanoid(getTableName(releaseSchema)),
          tag,
          description,
          productId,
        },
      ])
      .returning()
      .execute()
  )[0];
}
