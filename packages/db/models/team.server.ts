import { secretKeySchema, teamSchema } from "../db/schema.server";
import { randomBytes } from "crypto";
import { db, nanoid } from "../db/config.server";
import { eq, getTableName } from "drizzle-orm";

import slug from "slug";
// used to generate a secret key per team
const SECRET_KEY_SIZE = 32; // 32 bytes for AES-256

export function generateSecretKey(): string {
  return randomBytes(SECRET_KEY_SIZE).toString("hex");
}

export async function createTeam(name: string) {
  const teamId = nanoid(getTableName(teamSchema));
  const secretKey = generateSecretKey();
  const apiKey = generateApiKey();

  const team = (
    await db
      .insert(teamSchema)
      .values({
        id: teamId,
        name: name,
        apiKey,
        slug: slug(name),
      })
      .returning()
      .execute()
  )[0];

  await db
    .insert(secretKeySchema)
    .values({
      id: nanoid(getTableName(secretKeySchema)),
      secretKey,
      teamId: team.id,
    })
    .execute();

  return team;
}

export function generateApiKey() {
  return "sk_" + randomBytes(24).toString("hex");
}

export async function refreshApiKey({ teamId }: { teamId: string }) {
  const apiKey = generateApiKey();

  await db
    .update(teamSchema)
    .set({ apiKey })
    .where(eq(teamSchema.id, teamId))
    .execute();
}

export async function isTeamOnboarded({ teamId }: { teamId: string }) {
  const team = await db
    .select()
    .from(teamSchema)
    .where(eq(teamSchema.id, teamId));

  return team[0].isOnboarded === 1;
}

export async function getTeam({ teamId }: { teamId: string }) {
  const team = await db.query.teamSchema.findFirst({
    where: eq(teamSchema.id, teamId),
  });

  return team;
}
