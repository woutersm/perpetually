/**
 * Per-visitor demo sandboxes.
 *
 * "Try the demo" creates a throwaway user + organization filled with sample
 * data. Sandboxes expire after SANDBOX_TTL_HOURS and are deleted whenever a
 * new sandbox is created, and by an hourly sweep while DEMO_MODE is on.
 */
import { and, inArray, isNotNull, lt, count, like } from "drizzle-orm";
import db from "@/lib/db/db";
import { organization, membership, user } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { createDemoOrganization } from "@/lib/demo/sample-data";
import { logger } from "@/lib/logger";

export const SANDBOX_TTL_HOURS = Number(process.env.SANDBOX_TTL_HOURS ?? 24);
const SANDBOX_EMAIL_DOMAIN = "sandbox.perpetually.dev";
const MAX_ACTIVE_SANDBOXES = Number(process.env.SANDBOX_MAX_ACTIVE ?? 500);

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** Thrown by server functions that call real third parties (Stripe, billing) */
export class SandboxRestrictedError extends Error {
  constructor(feature: string) {
    super(`${feature} is disabled in the demo sandbox`);
  }
}

export function assertNotSandbox(
  org: { sandboxExpiresAt?: Date | null } | null | undefined,
  feature: string
) {
  if (org?.sandboxExpiresAt) throw new SandboxRestrictedError(feature);
}

export async function createSandbox() {
  await cleanupExpiredSandboxes();

  const [{ active }] = await db
    .select({ active: count() })
    .from(organization)
    .where(isNotNull(organization.sandboxExpiresAt));
  if (active >= MAX_ACTIVE_SANDBOXES) {
    throw new Error("The demo is busy right now. Please try again later.");
  }

  const id = crypto.randomUUID().slice(0, 8);
  const email = `demo-${id}@${SANDBOX_EMAIL_DOMAIN}`;
  const password = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SANDBOX_TTL_HOURS * 60 * 60 * 1000);

  // Create the user directly (skips sign-up email verification)
  const ctx = await auth.$context;
  const demoUser = await ctx.internalAdapter.createUser({
    email,
    name: "Demo User",
    emailVerified: true,
  });
  await ctx.internalAdapter.linkAccount({
    userId: demoUser.id,
    providerId: "credential",
    accountId: demoUser.id,
    password: await ctx.password.hash(password),
  });

  await createDemoOrganization({
    ownerId: demoUser.id,
    name: "Pixelforge",
    slug: `pixelforge-${id}`,
    sandboxExpiresAt: expiresAt,
  });

  logger.info("demo:sandbox:created", { user: demoUser.id.slice(0, 8), expiresAt: expiresAt.toISOString() });
  return { email, password, expiresAt };
}

/** Delete expired sandbox orgs (cascades to all their data) and their users */
export async function cleanupExpiredSandboxes() {
  const expired = await db
    .select({ id: organization.id })
    .from(organization)
    .where(and(isNotNull(organization.sandboxExpiresAt), lt(organization.sandboxExpiresAt, new Date())));
  if (expired.length === 0) return 0;

  const orgIds = expired.map((o) => o.id);
  const members = await db
    .select({ userId: membership.userId })
    .from(membership)
    .where(inArray(membership.organizationId, orgIds));

  await db.delete(organization).where(inArray(organization.id, orgIds));
  if (members.length) {
    await db.delete(user).where(
      and(
        inArray(user.id, members.map((m) => m.userId)),
        like(user.email, `%@${SANDBOX_EMAIL_DOMAIN}`)
      )
    );
  }

  logger.info("demo:sandbox:cleanup", { deleted: orgIds.length });
  return orgIds.length;
}

if (isDemoMode()) {
  setInterval(() => {
    cleanupExpiredSandboxes().catch((err) => logger.exception("demo:sandbox:cleanup_failed", err));
  }, 60 * 60 * 1000).unref?.();
}
