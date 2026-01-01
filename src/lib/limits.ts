import { eq, count } from "drizzle-orm";
import db from "@/lib/db/db";
import { organization, license, product, membership } from "@/lib/db/schema";

// ==================== TIER DEFINITIONS ====================

export type SubscriptionTier = "starter" | "pro" | "business";

export const TIER_LIMITS = {
  starter: {
    licenses: 100,
    products: 3,
    members: 1,
    features: {
      customerPortal: true,
      emailNotifications: true,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
    },
  },
  pro: {
    licenses: Infinity,
    products: Infinity,
    members: 1,
    features: {
      customerPortal: true,
      emailNotifications: true,
      apiAccess: true,
      customBranding: false,
      prioritySupport: true,
    },
  },
  business: {
    licenses: Infinity,
    products: Infinity,
    members: Infinity,
    features: {
      customerPortal: true,
      emailNotifications: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
    },
  },
} as const;

export const TIER_PRICES = {
  starter: { monthly: 0, priceId: null },
  pro: { monthly: 29, priceId: process.env.STRIPE_PRICE_PRO },
  business: { monthly: 99, priceId: process.env.STRIPE_PRICE_BUSINESS },
} as const;

// ==================== USAGE CHECKS ====================

export interface UsageCheck {
  allowed: boolean;
  current: number;
  limit: number;
  tier: SubscriptionTier;
}

/**
 * Check if organization can create more licenses
 */
export async function checkLicenseLimit(
  organizationId: string
): Promise<UsageCheck> {
  const [org] = await db
    .select({ subscriptionTier: organization.subscriptionTier })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error("Organization not found");
  }

  const tier = (org.subscriptionTier ?? "starter") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];

  const [result] = await db
    .select({ count: count() })
    .from(license)
    .where(eq(license.organizationId, organizationId));

  const current = result?.count ?? 0;

  return {
    allowed: current < limits.licenses,
    current,
    limit: limits.licenses,
    tier,
  };
}

/**
 * Check if organization can create more products
 */
export async function checkProductLimit(
  organizationId: string
): Promise<UsageCheck> {
  const [org] = await db
    .select({ subscriptionTier: organization.subscriptionTier })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error("Organization not found");
  }

  const tier = (org.subscriptionTier ?? "starter") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];

  const [result] = await db
    .select({ count: count() })
    .from(product)
    .where(eq(product.organizationId, organizationId));

  const current = result?.count ?? 0;

  return {
    allowed: current < limits.products,
    current,
    limit: limits.products,
    tier,
  };
}

/**
 * Check if organization can add more team members
 */
export async function checkMemberLimit(
  organizationId: string
): Promise<UsageCheck> {
  const [org] = await db
    .select({ subscriptionTier: organization.subscriptionTier })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error("Organization not found");
  }

  const tier = (org.subscriptionTier ?? "starter") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];

  const [result] = await db
    .select({ count: count() })
    .from(membership)
    .where(eq(membership.organizationId, organizationId));

  const current = result?.count ?? 0;

  return {
    allowed: current < limits.members,
    current,
    limit: limits.members,
    tier,
  };
}

// ==================== FEATURE CHECKS ====================

/**
 * Check if a feature is available for the organization's tier
 */
export async function checkFeatureAccess(
  organizationId: string,
  feature: keyof (typeof TIER_LIMITS)["starter"]["features"]
): Promise<{ allowed: boolean; tier: SubscriptionTier }> {
  const [org] = await db
    .select({ subscriptionTier: organization.subscriptionTier })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error("Organization not found");
  }

  const tier = (org.subscriptionTier ?? "starter") as SubscriptionTier;
  const allowed = TIER_LIMITS[tier].features[feature];

  return { allowed, tier };
}

// ==================== USAGE SUMMARY ====================

export type TierFeatures = {
  customerPortal: boolean;
  emailNotifications: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
};

export interface UsageSummary {
  tier: SubscriptionTier;
  licenses: { current: number; limit: number; percentage: number };
  products: { current: number; limit: number; percentage: number };
  members: { current: number; limit: number; percentage: number };
  features: TierFeatures;
}

/**
 * Get complete usage summary for an organization
 */
export async function getUsageSummary(
  organizationId: string
): Promise<UsageSummary> {
  const [org] = await db
    .select({ subscriptionTier: organization.subscriptionTier })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error("Organization not found");
  }

  const tier = (org.subscriptionTier ?? "starter") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];

  // Get all counts in parallel
  const [licenseResult, productResult, memberResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(license)
      .where(eq(license.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(product)
      .where(eq(product.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(membership)
      .where(eq(membership.organizationId, organizationId)),
  ]);

  const licenseCount = licenseResult[0]?.count ?? 0;
  const productCount = productResult[0]?.count ?? 0;
  const memberCount = memberResult[0]?.count ?? 0;

  return {
    tier,
    licenses: {
      current: licenseCount,
      limit: limits.licenses,
      percentage:
        limits.licenses === Infinity
          ? 0
          : Math.round((licenseCount / limits.licenses) * 100),
    },
    products: {
      current: productCount,
      limit: limits.products,
      percentage:
        limits.products === Infinity
          ? 0
          : Math.round((productCount / limits.products) * 100),
    },
    members: {
      current: memberCount,
      limit: limits.members,
      percentage:
        limits.members === Infinity
          ? 0
          : Math.round((memberCount / limits.members) * 100),
    },
    features: limits.features,
  };
}

// ==================== TIER HELPERS ====================

/**
 * Get display name for a tier
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    starter: "Starter",
    pro: "Pro",
    business: "Business",
  };
  return names[tier];
}

/**
 * Check if an upgrade is needed based on current usage
 */
export function needsUpgrade(usage: UsageSummary): {
  needed: boolean;
  reason?: string;
  suggestedTier?: SubscriptionTier;
} {
  if (usage.tier === "business") {
    return { needed: false };
  }

  // Check if at limit
  if (usage.licenses.percentage >= 100) {
    return {
      needed: true,
      reason: "License limit reached",
      suggestedTier: usage.tier === "starter" ? "pro" : "business",
    };
  }

  if (usage.products.percentage >= 100) {
    return {
      needed: true,
      reason: "Product limit reached",
      suggestedTier: usage.tier === "starter" ? "pro" : "business",
    };
  }

  if (usage.members.percentage >= 100) {
    return {
      needed: true,
      reason: "Team member limit reached",
      suggestedTier: "business",
    };
  }

  // Warn at 80%
  if (usage.licenses.percentage >= 80) {
    return {
      needed: false,
      reason: `${usage.licenses.percentage}% of license limit used`,
      suggestedTier: usage.tier === "starter" ? "pro" : "business",
    };
  }

  return { needed: false };
}
