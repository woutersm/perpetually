import { createServerFn } from "@tanstack/react-start";
import db from "@/lib/db/db";
import { organization, membership } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFn } from "./sessions";
import { loggingMiddleware } from "@/middleware/logging";

// Create organization for newly registered user
export const createOrganization = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware("createOrganization")])
  .inputValidator((data: { name: string; slug: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Check if slug is already taken
    const existing = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Organization slug already taken");
    }

    // Generate API key
    const apiKey = `pk_${crypto.randomUUID().replace(/-/g, "")}`;

    // Create organization
    const [org] = await db
      .insert(organization)
      .values({
        name: data.name,
        slug: data.slug,
        apiKey,
        isOnboarded: false,
      })
      .returning();

    // Create owner membership
    await db.insert(membership).values({
      userId: session.user.id,
      organizationId: org.id,
      role: "owner",
    });

    return org;
  });

// Get current organization
export const getCurrentOrganization = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware("getCurrentOrganization")])
  .handler(async () => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    return session.currentOrganization;
  }
);

// Update organization
export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware("updateOrganization")])
  .inputValidator(
    (data: {
      name?: string;
      stripeApiKey?: string;
      stripeWebhookSecret?: string;
      isOnboarded?: boolean;
    }) => data
  )
  .handler(async ({ data }) => {
    const session = await getSessionFn();

    if (!session?.user || !session.currentOrganization) {
      throw new Error("Unauthorized");
    }

    const [updated] = await db
      .update(organization)
      .set(data)
      .where(eq(organization.id, session.currentOrganization.id))
      .returning();

    return updated;
  });
