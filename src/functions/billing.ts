import { createServerFn } from "@tanstack/react-start";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUsageSummary, TIER_LIMITS, TIER_PRICES, type SubscriptionTier } from "@/lib/limits";
import Stripe from "stripe";
import { assertNotSandbox } from "@/lib/demo/sandbox";

// Initialize Stripe for Perpetually's billing (not customer's Stripe)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Get billing info and usage summary
export const getBillingInfo = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId } }) => {
    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        subscriptionTier: organization.subscriptionTier,
        subscriptionStatus: organization.subscriptionStatus,
        billingStripeCustomerId: organization.billingStripeCustomerId,
        billingStripeSubscriptionId: organization.billingStripeSubscriptionId,
        billingCurrentPeriodEnd: organization.billingCurrentPeriodEnd,
        billingTrialEndsAt: organization.billingTrialEndsAt,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    const usage = await getUsageSummary(organizationId);
    const tier = (org.subscriptionTier ?? "starter") as SubscriptionTier;
    const price = TIER_PRICES[tier];

    return {
      organization: org,
      usage,
      tier,
      tierLimits: TIER_LIMITS[tier],
      price: price.monthly,
      isTrialing: org.subscriptionStatus === "trialing",
      trialEndsAt: org.billingTrialEndsAt,
      currentPeriodEnd: org.billingCurrentPeriodEnd,
      hasPaymentMethod: !!org.billingStripeCustomerId,
    };
  });

// Create Stripe Checkout session for upgrading
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { tier: "pro" | "business" }) => data)
  .handler(async ({ data, context: { organizationId, organization: currentOrg } }) => {
    assertNotSandbox(currentOrg, "Billing");
    if (!stripe) {
      throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
    }

    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        billingStripeCustomerId: organization.billingStripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    const priceId = TIER_PRICES[data.tier].priceId;
    if (!priceId) {
      throw new Error(`Price ID not configured for ${data.tier} tier`);
    }

    // Create or use existing Stripe customer
    let customerId = org.billingStripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name ?? undefined,
        metadata: {
          organizationId: org.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await db
        .update(organization)
        .set({ billingStripeCustomerId: customerId })
        .where(eq(organization.id, organizationId));
    }

    // Create checkout session with 14-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId: org.id,
          tier: data.tier,
        },
      },
      success_url: `${process.env.APP_URL || "http://localhost:3000"}/settings/billing?success=true`,
      cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/settings/billing?canceled=true`,
      metadata: {
        organizationId: org.id,
        tier: data.tier,
      },
    });

    return { url: session.url };
  });

// Create Stripe Customer Portal session
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId, organization: currentOrg } }) => {
    assertNotSandbox(currentOrg, "Billing");
    if (!stripe) {
      throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
    }

    const [org] = await db
      .select({
        billingStripeCustomerId: organization.billingStripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org?.billingStripeCustomerId) {
      throw new Error("No billing account found. Please upgrade first.");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.billingStripeCustomerId,
      return_url: `${process.env.APP_URL || "http://localhost:3000"}/settings/billing`,
    });

    return { url: session.url };
  });

// Get all tier information for display
export const getTierInfo = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    return {
      tiers: [
        {
          id: "starter" as const,
          name: "Starter",
          price: TIER_PRICES.starter.monthly,
          limits: TIER_LIMITS.starter,
          description: "Perfect for getting started",
          popular: false,
        },
        {
          id: "pro" as const,
          name: "Pro",
          price: TIER_PRICES.pro.monthly,
          limits: TIER_LIMITS.pro,
          description: "For growing businesses",
          popular: true,
        },
        {
          id: "business" as const,
          name: "Business",
          price: TIER_PRICES.business.monthly,
          limits: TIER_LIMITS.business,
          description: "For teams and enterprises",
          popular: false,
        },
      ],
    };
  });
