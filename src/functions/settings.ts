import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { secretKey, organization, membership, user } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Generate a secure API key
function generateSecretKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "sk_live_";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Get organization settings
export const getOrganizationSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getOrganizationSettings")])
  .handler(async ({ context: { organizationId } }) => {
    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        apiKey: organization.apiKey,
        isOnboarded: organization.isOnboarded,
        stripeConnectId: organization.stripeConnectId,
        stripeConnectedAt: organization.stripeConnectedAt,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    return org;
  });

// Update organization settings
export const updateOrganizationSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("updateOrganizationSettings")])
  .inputValidator((data: { name?: string; slug?: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [updated] = await db
      .update(organization)
      .set(data)
      .where(eq(organization.id, organizationId))
      .returning();

    if (!updated) {
      throw new Error("Organization not found");
    }

    return updated;
  });

// Get team members
export const getTeamMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getTeamMembers")])
  .handler(async ({ context: { organizationId } }) => {
    const members = await db
      .select({
        id: membership.id,
        role: membership.role,
        createdAt: membership.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(membership)
      .leftJoin(user, eq(membership.userId, user.id))
      .where(eq(membership.organizationId, organizationId))
      .orderBy(desc(membership.createdAt));

    return members;
  });

// Update team member role
export const updateTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("updateTeamMemberRole")])
  .inputValidator(
    (data: { membershipId: string; role: "owner" | "admin" | "member" }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    const [updated] = await db
      .update(membership)
      .set({ role: data.role })
      .where(
        and(
          eq(membership.id, data.membershipId),
          eq(membership.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Team member not found");
    }

    return updated;
  });

// Remove team member
export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("removeTeamMember")])
  .inputValidator((data: { membershipId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [deleted] = await db
      .delete(membership)
      .where(
        and(
          eq(membership.id, data.membershipId),
          eq(membership.organizationId, organizationId)
        )
      )
      .returning();

    if (!deleted) {
      throw new Error("Team member not found");
    }

    return { success: true };
  });

// Get all API keys
export const getApiKeys = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getApiKeys")])
  .handler(async ({ context: { organizationId } }) => {
    const keys = await db
      .select({
        id: secretKey.id,
        name: secretKey.name,
        key: secretKey.key,
        scopes: secretKey.scopes,
        createdAt: secretKey.createdAt,
        expiresAt: secretKey.expiresAt,
        lastUsedAt: secretKey.lastUsedAt,
      })
      .from(secretKey)
      .where(eq(secretKey.organizationId, organizationId))
      .orderBy(desc(secretKey.createdAt));

    // Mask the keys (only show last 4 chars)
    return keys.map((k) => ({
      ...k,
      keyMasked: `sk_live_${"•".repeat(28)}${k.key.slice(-4)}`,
    }));
  });

// Create a new API key
export const createApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("createApiKey")])
  .inputValidator(
    (data: { name?: string; scopes?: string[]; expiresAt?: string }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    const key = generateSecretKey();

    const [newKey] = await db
      .insert(secretKey)
      .values({
        key,
        name: data.name,
        scopes: data.scopes ?? [],
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        organizationId,
      })
      .returning();

    // Return the full key only once (on creation)
    return { ...newKey, fullKey: key };
  });

// Delete an API key
export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("deleteApiKey")])
  .inputValidator((data: { keyId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [deleted] = await db
      .delete(secretKey)
      .where(
        and(
          eq(secretKey.id, data.keyId),
          eq(secretKey.organizationId, organizationId)
        )
      )
      .returning();

    if (!deleted) {
      throw new Error("API key not found");
    }

    return { success: true };
  });
