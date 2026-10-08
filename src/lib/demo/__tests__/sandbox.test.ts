import { describe, it, expect } from "vitest";
import { eq, count } from "drizzle-orm";
import db from "@/lib/db/db";
import {
  organization,
  user,
  membership,
  product,
  customer,
  license,
  licensePolicy,
  licenseEvent,
} from "@/lib/db/schema";
import { createSandbox, cleanupExpiredSandboxes } from "../sandbox";
import { issueLicense } from "@/lib/services/license";

async function sandboxOrgFor(email: string) {
  const [row] = await db
    .select({ org: organization, userId: user.id })
    .from(user)
    .innerJoin(membership, eq(membership.userId, user.id))
    .innerJoin(organization, eq(organization.id, membership.organizationId))
    .where(eq(user.email, email));
  return row;
}

describe("demo sandbox", () => {
  it("creates a verified user and an org full of sample data", async () => {
    const sandbox = await createSandbox();
    const { org } = await sandboxOrgFor(sandbox.email);

    expect(org.sandboxExpiresAt).toBeInstanceOf(Date);
    expect(org.isOnboarded).toBe(true);

    const [{ licenses }] = await db
      .select({ licenses: count() })
      .from(license)
      .where(eq(license.organizationId, org.id));
    expect(licenses).toBeGreaterThan(50);

    const [demoUser] = await db.select().from(user).where(eq(user.email, sandbox.email));
    expect(demoUser.emailVerified).toBe(true);
  });

  it("deletes expired sandboxes with all their data and users", async () => {
    const sandbox = await createSandbox();
    const { org, userId } = await sandboxOrgFor(sandbox.email);

    await db
      .update(organization)
      .set({ sandboxExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(organization.id, org.id));

    expect(await cleanupExpiredSandboxes()).toBeGreaterThanOrEqual(1);

    const remainingLicenses = await db
      .select()
      .from(license)
      .where(eq(license.organizationId, org.id));
    const remainingUser = await db.select().from(user).where(eq(user.id, userId));
    expect(remainingLicenses).toHaveLength(0);
    expect(remainingUser).toHaveLength(0);
  });
});

describe("issueLicense", () => {
  it("issues perpetual licenses for policies without a length", async () => {
    const sandbox = await createSandbox();
    const { org } = await sandboxOrgFor(sandbox.email);

    const [prod] = await db
      .insert(product)
      .values({ name: "Perpetual Tool", slug: "perpetual-tool", organizationId: org.id })
      .returning();
    await db
      .insert(licensePolicy)
      .values({ name: "Forever", licenseLengthDays: null, activationLimit: 2, productId: prod.id });
    const [buyer] = await db
      .insert(customer)
      .values({ name: "Buyer", email: "buyer@example.com", organizationId: org.id })
      .returning();

    const result = await issueLicense({
      organizationId: org.id,
      productId: prod.id,
      customerId: buyer.id,
      stripePaymentIntentId: "pi_test_perpetual",
      isTest: false,
    });

    expect(result.expiresAt).toBeNull();
    expect(result.activationLimit).toBe(2);
    expect(result.license.key).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);

    const events = await db
      .select()
      .from(licenseEvent)
      .where(eq(licenseEvent.licenseId, result.license.id));
    expect(events.map((e) => e.type)).toEqual(["license.created"]);

    await db.delete(organization).where(eq(organization.id, org.id));
  });
});
