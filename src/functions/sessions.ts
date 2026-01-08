import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { membership, organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const getSessionFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return null;
    }

    // Get user's memberships with organizations using query builder
    const memberships = await db
      .select({
        id: membership.id,
        role: membership.role,
        userId: membership.userId,
        organizationId: membership.organizationId,
        createdAt: membership.createdAt,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          apiKey: organization.apiKey,
          isOnboarded: organization.isOnboarded,
          stripeConnectId: organization.stripeConnectId,
          stripeWebhookSecret: organization.stripeWebhookSecret,
        },
      })
      .from(membership)
      .leftJoin(organization, eq(membership.organizationId, organization.id))
      .where(eq(membership.userId, session.user.id));

    // Default to first org (owner's org typically)
    const currentOrganization = memberships[0]?.organization ?? null;

    return {
      ...session,
      memberships,
      currentOrganization,
    };
  });

// Type for the session with organization context
export type SessionWithOrg = NonNullable<Awaited<ReturnType<typeof getSessionFn>>>;

// Get test mode from cookie
const TEST_MODE_COOKIE = "perpetually_test_mode";

export const getTestModeFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const cookieHeader = headers.get("cookie") || "";
    const match = cookieHeader.match(
      new RegExp(`(^|; )${TEST_MODE_COOKIE}=([^;]+)`)
    );
    return match?.[2] === "true";
  }
);
