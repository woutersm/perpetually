import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { secretKey, organization, membership, user, invitation } from "@/lib/db/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { checkMemberLimit, checkFeatureAccess } from "@/lib/limits";

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

// ==================== INVITATIONS ====================

// Generate invitation token
function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Get pending invitations
export const getInvitations = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getInvitations")])
  .handler(async ({ context: { organizationId } }) => {
    const invitations = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        invitedBy: {
          id: user.id,
          name: user.name,
        },
      })
      .from(invitation)
      .leftJoin(user, eq(invitation.invitedBy, user.id))
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          gt(invitation.expiresAt, new Date())
        )
      )
      .orderBy(desc(invitation.createdAt));

    return invitations;
  });

// Invite a team member
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("inviteTeamMember")])
  .inputValidator((data: { email: string; role?: "member" }) => data)
  .handler(async ({ data, context: { organizationId, userId } }) => {
    const email = data.email.toLowerCase().trim();

    // Check member limit
    const limitCheck = await checkMemberLimit(organizationId);
    if (!limitCheck.allowed) {
      throw new Error(
        `Team member limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade to add more members.`
      );
    }

    // Check if user is already a member
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser) {
      const [existingMembership] = await db
        .select({ id: membership.id })
        .from(membership)
        .where(
          and(
            eq(membership.userId, existingUser.id),
            eq(membership.organizationId, organizationId)
          )
        )
        .limit(1);

      if (existingMembership) {
        throw new Error("This user is already a member of your organization");
      }
    }

    // Check for existing pending invitation
    const [existingInvite] = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.email, email),
          eq(invitation.organizationId, organizationId),
          gt(invitation.expiresAt, new Date())
        )
      )
      .limit(1);

    if (existingInvite) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Get organization name for email
    const [org] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    // Create invitation (expires in 7 days)
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [newInvitation] = await db
      .insert(invitation)
      .values({
        email,
        role: data.role || "member",
        token,
        expiresAt,
        organizationId,
        invitedBy: userId,
      })
      .returning();

    // Send invitation email
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    void sendEmail({
      to: email,
      subject: `You've been invited to join ${org?.name || "an organization"} on Perpetually`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">P</div>
          </div>
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px; text-align: center; color: #111;">You're invited!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
            You've been invited to join <strong>${org?.name || "an organization"}</strong> on Perpetually, the modern license management platform.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
          </div>
          <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
            This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Perpetually · License Management Made Simple
          </p>
        </div>
      `,
    });

    return newInvitation;
  });

// Cancel an invitation
export const cancelInvitation = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("cancelInvitation")])
  .inputValidator((data: { invitationId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [deleted] = await db
      .delete(invitation)
      .where(
        and(
          eq(invitation.id, data.invitationId),
          eq(invitation.organizationId, organizationId)
        )
      )
      .returning();

    if (!deleted) {
      throw new Error("Invitation not found");
    }

    return { success: true };
  });

// Resend invitation email
export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("resendInvitation")])
  .inputValidator((data: { invitationId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    // Get invitation
    const [invite] = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
      })
      .from(invitation)
      .where(
        and(
          eq(invitation.id, data.invitationId),
          eq(invitation.organizationId, organizationId),
          gt(invitation.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invite) {
      throw new Error("Invitation not found or expired");
    }

    // Get organization name
    const [org] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    // Send email
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${invite.token}`;

    await sendEmail({
      to: invite.email,
      subject: `Reminder: You've been invited to join ${org?.name || "an organization"} on Perpetually`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">P</div>
          </div>
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px; text-align: center; color: #111;">Reminder: You're invited!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
            This is a reminder that you've been invited to join <strong>${org?.name || "an organization"}</strong> on Perpetually.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Perpetually · License Management Made Simple
          </p>
        </div>
      `,
    });

    return { success: true };
  });

// ==================== BRANDING ====================

// Validate hex color
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Get branding settings
export const getBrandingSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getBrandingSettings")])
  .handler(async ({ context: { organizationId } }) => {
    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        brandingEnabled: organization.brandingEnabled,
        brandLogo: organization.brandLogo,
        brandAccentColor: organization.brandAccentColor,
        brandSupportEmail: organization.brandSupportEmail,
        brandHidePoweredBy: organization.brandHidePoweredBy,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    // Check feature access
    const { allowed } = await checkFeatureAccess(organizationId, "customBranding");

    return {
      ...org,
      featureEnabled: allowed,
    };
  });

// Update branding settings
export const updateBrandingSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("updateBrandingSettings")])
  .inputValidator(
    (data: {
      brandLogo?: string | null;
      brandAccentColor?: string | null;
      brandSupportEmail?: string | null;
      brandHidePoweredBy?: boolean;
    }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    // Check feature access
    const { allowed, tier } = await checkFeatureAccess(
      organizationId,
      "customBranding"
    );

    if (!allowed) {
      throw new Error(
        `Custom branding is only available on the Business plan. You're currently on ${tier}.`
      );
    }

    // Validate accent color if provided
    if (data.brandAccentColor && !isValidHexColor(data.brandAccentColor)) {
      throw new Error("Invalid accent color. Please use a hex color like #FF6B35");
    }

    // Validate email if provided
    if (data.brandSupportEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.brandSupportEmail)) {
        throw new Error("Invalid email address");
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      brandingEnabled: true,
    };

    if (data.brandLogo !== undefined) {
      updateData.brandLogo = data.brandLogo;
    }
    if (data.brandAccentColor !== undefined) {
      updateData.brandAccentColor = data.brandAccentColor;
    }
    if (data.brandSupportEmail !== undefined) {
      updateData.brandSupportEmail = data.brandSupportEmail;
    }
    if (data.brandHidePoweredBy !== undefined) {
      updateData.brandHidePoweredBy = data.brandHidePoweredBy;
    }

    const [updated] = await db
      .update(organization)
      .set(updateData)
      .where(eq(organization.id, organizationId))
      .returning();

    if (!updated) {
      throw new Error("Organization not found");
    }

    return {
      brandingEnabled: updated.brandingEnabled,
      brandLogo: updated.brandLogo,
      brandAccentColor: updated.brandAccentColor,
      brandSupportEmail: updated.brandSupportEmail,
      brandHidePoweredBy: updated.brandHidePoweredBy,
    };
  });

// Reset branding to defaults
export const resetBrandingSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("resetBrandingSettings")])
  .handler(async ({ context: { organizationId } }) => {
    const [updated] = await db
      .update(organization)
      .set({
        brandingEnabled: false,
        brandLogo: null,
        brandAccentColor: null,
        brandSupportEmail: null,
        brandHidePoweredBy: false,
      })
      .where(eq(organization.id, organizationId))
      .returning();

    if (!updated) {
      throw new Error("Organization not found");
    }

    return { success: true };
  });
