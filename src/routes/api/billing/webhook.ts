import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import db from "@/lib/db/db";
import { organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { SubscriptionTier } from "@/lib/limits";

/**
 * Webhook handler for Perpetually's own Stripe billing.
 * This is SEPARATE from customer webhooks (/api/hooks/$organizationId).
 *
 * Handles:
 * - checkout.session.completed: User completes upgrade checkout
 * - customer.subscription.updated: Subscription changes (upgrades, downgrades)
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.payment_failed: Payment failed
 * - invoice.paid: Payment successful (clears past_due status)
 */

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!stripe) {
          console.error("Stripe is not configured");
          return new Response(
            JSON.stringify({ error: "Stripe not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error("STRIPE_BILLING_WEBHOOK_SECRET not configured");
          return new Response(
            JSON.stringify({ error: "Webhook secret not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        const payload = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
          return new Response(
            JSON.stringify({ error: "Missing signature" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        let event: Stripe.Event;
        try {
          event = Stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err) {
          console.error("Webhook signature verification failed:", err);
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        console.log("Billing webhook received:", event.type);

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              await handleCheckoutCompleted(session);
              break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const subscription = event.data.object as Stripe.Subscription;
              await handleSubscriptionUpdated(subscription);
              break;
            }

            case "customer.subscription.deleted": {
              const subscription = event.data.object as Stripe.Subscription;
              await handleSubscriptionDeleted(subscription);
              break;
            }

            case "invoice.payment_failed": {
              const invoice = event.data.object as Stripe.Invoice;
              await handlePaymentFailed(invoice);
              break;
            }

            case "invoice.paid": {
              const invoice = event.data.object as Stripe.Invoice;
              await handlePaymentSucceeded(invoice);
              break;
            }

            default:
              console.log("Unhandled billing event:", event.type);
          }

          return new Response(
            JSON.stringify({ received: true }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error("Error processing billing webhook:", error);
          return new Response(
            JSON.stringify({ error: "Webhook processing failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});

// Helper to determine tier from Stripe price
function getTierFromPrice(priceId: string): SubscriptionTier {
  const proPriceId = process.env.STRIPE_PRICE_PRO;
  const businessPriceId = process.env.STRIPE_PRICE_BUSINESS;

  if (priceId === proPriceId) return "pro";
  if (priceId === businessPriceId) return "business";
  return "starter";
}

// Handle checkout completion
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  const tier = session.metadata?.tier as SubscriptionTier | undefined;

  if (!organizationId) {
    console.error("Checkout session missing organizationId metadata");
    return;
  }

  console.log("Checkout completed for org:", organizationId, "tier:", tier);

  // Update organization with subscription info
  await db
    .update(organization)
    .set({
      billingStripeCustomerId: session.customer as string,
      billingStripeSubscriptionId: session.subscription as string,
      subscriptionTier: tier || "pro",
      subscriptionStatus: "trialing", // Will be updated by subscription.updated event
    })
    .where(eq(organization.id, organizationId));

  console.log("Organization updated from checkout:", organizationId);
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    // Try to find org by customer ID
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.billingStripeCustomerId, subscription.customer as string))
      .limit(1);

    if (!org) {
      console.error("Could not find organization for subscription:", subscription.id);
      return;
    }

    await updateOrgSubscription(org.id, subscription);
    return;
  }

  await updateOrgSubscription(organizationId, subscription);
}

async function updateOrgSubscription(organizationId: string, subscription: Stripe.Subscription) {
  // Determine tier from price
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? getTierFromPrice(priceId) : "starter";

  // Map Stripe status to our status
  let status: "trialing" | "active" | "past_due" | "canceled";
  switch (subscription.status) {
    case "trialing":
      status = "trialing";
      break;
    case "active":
      status = "active";
      break;
    case "past_due":
      status = "past_due";
      break;
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      status = "canceled";
      break;
    default:
      status = "active";
  }

  const updateData: Record<string, unknown> = {
    billingStripeSubscriptionId: subscription.id,
    subscriptionTier: tier,
    subscriptionStatus: status,
    billingCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
  };

  // Add trial end date if applicable
  if (subscription.trial_end) {
    updateData.billingTrialEndsAt = new Date(subscription.trial_end * 1000);
  }

  await db
    .update(organization)
    .set(updateData)
    .where(eq(organization.id, organizationId));

  console.log("Subscription updated for org:", organizationId, { tier, status });
}

// Handle subscription deletion (canceled)
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Find org by subscription ID
  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.billingStripeSubscriptionId, subscription.id))
    .limit(1);

  if (!org) {
    console.error("Could not find organization for deleted subscription:", subscription.id);
    return;
  }

  // Downgrade to starter
  await db
    .update(organization)
    .set({
      subscriptionTier: "starter",
      subscriptionStatus: "canceled",
      billingStripeSubscriptionId: null,
      billingCurrentPeriodEnd: null,
      billingTrialEndsAt: null,
    })
    .where(eq(organization.id, org.id));

  console.log("Organization downgraded to starter:", org.id);
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.customer) return;

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.billingStripeCustomerId, invoice.customer as string))
    .limit(1);

  if (!org) {
    console.error("Could not find organization for failed payment");
    return;
  }

  await db
    .update(organization)
    .set({ subscriptionStatus: "past_due" })
    .where(eq(organization.id, org.id));

  console.log("Organization marked as past_due:", org.id);
}

// Handle successful payment (clears past_due)
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.customer) return;

  const [org] = await db
    .select({ id: organization.id, subscriptionStatus: organization.subscriptionStatus })
    .from(organization)
    .where(eq(organization.billingStripeCustomerId, invoice.customer as string))
    .limit(1);

  if (!org) return;

  // Only update if currently past_due
  if (org.subscriptionStatus === "past_due") {
    await db
      .update(organization)
      .set({ subscriptionStatus: "active" })
      .where(eq(organization.id, org.id));

    console.log("Organization payment recovered:", org.id);
  }
}
