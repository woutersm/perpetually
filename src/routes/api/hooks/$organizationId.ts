import { createFileRoute } from "@tanstack/react-router";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";
import db from "@/lib/db/db";
import {
  organization,
  product,
  customer,
  license,
  licenseEvent,
  licensePolicy,
  membership,
  user,
} from "@/lib/db/schema";
import {
  sendLicenseCreatedEmail,
  sendRefundDetectedEmail,
  isEmailConfigured,
} from "@/lib/email/notifications";
import { checkLicenseLimit, checkProductLimit } from "@/lib/limits";
import { createWideEvent, type WideEvent } from "@/lib/wide-event";
import { runWithTrace, generateTraceId } from "@/lib/trace-context";

// Generate license key (e.g., XXXX-XXXX-XXXX-XXXX)
function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 4;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

// ==================== Product Sync ====================

async function handleProductCreated(
  event: WideEvent,
  {
    organizationId,
    stripeProduct,
  }: {
    organizationId: string;
    stripeProduct: Stripe.Product;
  }
) {
  // Check if product already exists
  const [existing] = await db
    .select()
    .from(product)
    .where(eq(product.stripeProductId, stripeProduct.id))
    .limit(1);

  if (existing) {
    event.set("product", {
      action: "found",
      id: existing.id,
      name: existing.name,
    });
    return existing;
  }

  // Check product limit before creating
  const limitCheck = await checkProductLimit(organizationId);
  if (!limitCheck.allowed) {
    event.set("product.limit_warning", true);
    event.set("product.limit_current", limitCheck.current);
    event.set("product.limit_max", limitCheck.limit);
  }

  const slug = stripeProduct.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const [newProduct] = await db
    .insert(product)
    .values({
      name: stripeProduct.name,
      slug: `${slug}-${Date.now()}`,
      description: stripeProduct.description || undefined,
      isActive: stripeProduct.active,
      stripeProductId: stripeProduct.id,
      syncedAt: new Date(),
      organizationId,
    })
    .returning();

  event.set("product", {
    action: "created",
    id: newProduct.id,
    name: newProduct.name,
    limit_warning: !limitCheck.allowed,
  });

  return newProduct;
}

async function handleProductUpdated(
  event: WideEvent,
  {
    organizationId,
    stripeProduct,
  }: {
    organizationId: string;
    stripeProduct: Stripe.Product;
  }
) {
  const [existing] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.stripeProductId, stripeProduct.id),
        eq(product.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    return handleProductCreated(event, { organizationId, stripeProduct });
  }

  const [updated] = await db
    .update(product)
    .set({
      name: stripeProduct.name,
      description: stripeProduct.description || undefined,
      isActive: stripeProduct.active,
      syncedAt: new Date(),
    })
    .where(eq(product.id, existing.id))
    .returning();

  event.set("product", {
    action: "updated",
    id: updated.id,
    name: updated.name,
  });

  return updated;
}

async function handleProductDeleted(
  event: WideEvent,
  {
    organizationId,
    stripeProductId,
  }: {
    organizationId: string;
    stripeProductId: string;
  }
) {
  const [existing] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.stripeProductId, stripeProductId),
        eq(product.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    event.set("product", { action: "not_found", stripe_id: stripeProductId });
    return null;
  }

  const [updated] = await db
    .update(product)
    .set({
      isActive: false,
      syncedAt: new Date(),
    })
    .where(eq(product.id, existing.id))
    .returning();

  event.set("product", {
    action: "deactivated",
    id: updated.id,
    name: updated.name,
  });

  return updated;
}

// ==================== Customer Sync ====================

async function findOrCreateCustomer(
  event: WideEvent,
  {
    organizationId,
    stripeCustomerId,
    stripe,
  }: {
    organizationId: string;
    stripeCustomerId: string;
    stripe: Stripe;
  }
) {
  // First, try to find by stripeCustomerId
  let [localCustomer] = await db
    .select()
    .from(customer)
    .where(
      and(
        eq(customer.stripeCustomerId, stripeCustomerId),
        eq(customer.organizationId, organizationId)
      )
    )
    .limit(1);

  if (localCustomer) {
    event.set("customer", {
      action: "found",
      id: localCustomer.id,
      email: localCustomer.email,
    });
    return localCustomer;
  }

  // Fetch customer details from Stripe
  const stripeCustomer = (await stripe.customers.retrieve(
    stripeCustomerId
  )) as Stripe.Customer;

  if (stripeCustomer.deleted) {
    event.set("customer", { action: "stripe_deleted", stripe_id: stripeCustomerId });
    return null;
  }

  if (!stripeCustomer.email) {
    event.set("customer", { action: "no_email", stripe_id: stripeCustomerId });
    return null;
  }

  // Check if customer exists by email
  [localCustomer] = await db
    .select()
    .from(customer)
    .where(
      and(
        eq(customer.email, stripeCustomer.email),
        eq(customer.organizationId, organizationId)
      )
    )
    .limit(1);

  if (localCustomer) {
    // Link existing customer to stripe
    const [updated] = await db
      .update(customer)
      .set({
        stripeCustomerId,
        name: stripeCustomer.name || localCustomer.name,
        syncedAt: new Date(),
      })
      .where(eq(customer.id, localCustomer.id))
      .returning();

    event.set("customer", {
      action: "linked",
      id: updated.id,
      email: updated.email,
    });
    return updated;
  }

  // Create new customer
  const [newCustomer] = await db
    .insert(customer)
    .values({
      name: stripeCustomer.name || stripeCustomer.email,
      email: stripeCustomer.email,
      company:
        typeof stripeCustomer.metadata?.company === "string"
          ? stripeCustomer.metadata.company
          : undefined,
      stripeCustomerId,
      syncedAt: new Date(),
      organizationId,
    })
    .returning();

  event.set("customer", {
    action: "created",
    id: newCustomer.id,
    email: newCustomer.email,
  });

  return newCustomer;
}

// ==================== License Creation ====================

async function createLicenseFromPayment(
  event: WideEvent,
  {
    organizationId,
    orgName,
    stripeProductId,
    stripeCustomerId,
    stripePaymentIntentId,
    isTest,
    metadata,
    stripe,
  }: {
    organizationId: string;
    orgName: string;
    stripeProductId: string;
    stripeCustomerId: string;
    stripePaymentIntentId: string;
    isTest: boolean;
    metadata?: Stripe.Metadata;
    stripe: Stripe;
  }
) {
  // Check license limit
  const limitCheck = await checkLicenseLimit(organizationId);
  if (!limitCheck.allowed) {
    event.set("license.limit_warning", true);
    event.set("license.limit_current", limitCheck.current);
    event.set("license.limit_max", limitCheck.limit);
  }

  // Find or create local product
  let [localProduct] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.stripeProductId, stripeProductId),
        eq(product.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!localProduct) {
    const stripeProduct = await stripe.products.retrieve(stripeProductId);
    localProduct = await handleProductCreated(event, {
      organizationId,
      stripeProduct,
    });
  } else {
    event.set("product", {
      action: "found",
      id: localProduct.id,
      name: localProduct.name,
    });
  }

  // Find or create local customer
  const localCustomer = await findOrCreateCustomer(event, {
    organizationId,
    stripeCustomerId,
    stripe,
  });

  if (!localCustomer) {
    event.set("license.created", false);
    event.set("license.error", "customer_missing");
    return null;
  }

  // Read metadata overrides
  const activationLimitOverride = metadata?.perpetually_activation_limit
    ? parseInt(metadata.perpetually_activation_limit, 10)
    : undefined;
  const licenseDurationDaysOverride = metadata?.perpetually_license_duration_days
    ? parseInt(metadata.perpetually_license_duration_days, 10)
    : undefined;

  // Get default policy
  let defaultActivationLimit: number | null = null;
  let defaultLicenseDays: number | null = null;

  const [defaultPolicy] = await db
    .select()
    .from(licensePolicy)
    .where(eq(licensePolicy.productId, localProduct.id))
    .limit(1);

  if (defaultPolicy) {
    defaultActivationLimit = defaultPolicy.activationLimit;
    defaultLicenseDays = defaultPolicy.licenseLengthDays;
  }

  const activationLimit = activationLimitOverride ?? defaultActivationLimit ?? null;
  const licenseDurationDays = licenseDurationDaysOverride ?? defaultLicenseDays ?? 365;

  // Create license
  const key = generateLicenseKey();
  const now = new Date();
  const expiresAt =
    licenseDurationDays === null || licenseDurationDays === 0
      ? null
      : new Date(now.getTime() + licenseDurationDays * 24 * 60 * 60 * 1000);

  const [newLicense] = await db
    .insert(license)
    .values({
      key,
      keyCreatedAt: now,
      status: "active",
      expiresAt,
      activationLimit,
      stripePaymentIntentId,
      isTest,
      productId: localProduct.id,
      customerId: localCustomer.id,
      organizationId,
      licensePolicyId: defaultPolicy?.id,
    })
    .returning();

  event.set("license", {
    created: true,
    id: newLicense.id,
    key: newLicense.key,
    expires_days: licenseDurationDays,
    activation_limit: activationLimit,
    is_test: isTest,
    limit_warning: !limitCheck.allowed,
  });

  // Audit trail
  await db.insert(licenseEvent).values({
    type: "license.created",
    actorType: "system",
    actorId: null,
    data: {
      stripePaymentIntentId,
      stripeProductId,
      stripeCustomerId,
      isTest,
      expiresAt: expiresAt?.toISOString() ?? null,
      activationLimit,
    },
    licenseId: newLicense.id,
    organizationId,
  });

  // Send email
  if (isEmailConfigured()) {
    try {
      await sendLicenseCreatedEmail({
        customerEmail: localCustomer.email,
        customerName: localCustomer.name ?? localCustomer.email,
        licenseKey: newLicense.key,
        productName: localProduct.name,
        expiresAt,
        activationLimit,
        orgName,
      });
      event.set("email", {
        sent: true,
        type: "license-created",
        to: localCustomer.email,
      });
    } catch (emailError) {
      event.set("email", {
        sent: false,
        type: "license-created",
        to: localCustomer.email,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  } else {
    event.set("email.skipped", true);
    event.set("email.reason", "not_configured");
  }

  return newLicense;
}

// ==================== Refund Handler ====================

async function handleChargeRefunded(
  event: WideEvent,
  {
    organizationId,
    orgName,
    charge,
  }: {
    organizationId: string;
    orgName: string;
    charge: Stripe.Charge;
  }
) {
  const paymentIntentId = charge.payment_intent as string | null;

  if (!paymentIntentId) {
    event.set("refund", { processed: false, reason: "no_payment_intent" });
    return;
  }

  const [affectedLicense] = await db
    .select()
    .from(license)
    .where(
      and(
        eq(license.stripePaymentIntentId, paymentIntentId),
        eq(license.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!affectedLicense) {
    event.set("refund", { processed: false, reason: "no_license_found" });
    return;
  }

  // Log refund event
  await db.insert(licenseEvent).values({
    type: "license.status_changed",
    actorType: "system",
    actorId: null,
    data: {
      event: "refund_detected",
      stripeChargeId: charge.id,
      refundAmount: charge.amount_refunded,
      refundReason: charge.refunds?.data?.[0]?.reason ?? "unknown",
      message: "Refund detected. License NOT automatically disabled.",
    },
    licenseId: affectedLicense.id,
    organizationId,
  });

  event.set("refund", {
    processed: true,
    license_id: affectedLicense.id,
    license_key: affectedLicense.key,
    amount_cents: charge.amount_refunded,
    reason: charge.refunds?.data?.[0]?.reason ?? "unknown",
  });

  // Send notification email
  if (isEmailConfigured()) {
    try {
      const [ownerMembership] = await db
        .select({ email: user.email, name: user.name })
        .from(membership)
        .innerJoin(user, eq(membership.userId, user.id))
        .where(
          and(
            eq(membership.organizationId, organizationId),
            eq(membership.role, "owner")
          )
        )
        .limit(1);

      const [licenseDetails] = await db
        .select({
          productName: product.name,
          customerEmail: customer.email,
          customerName: customer.name,
        })
        .from(license)
        .innerJoin(product, eq(license.productId, product.id))
        .innerJoin(customer, eq(license.customerId, customer.id))
        .where(eq(license.id, affectedLicense.id))
        .limit(1);

      if (ownerMembership && licenseDetails) {
        const refundAmountFormatted = (charge.amount_refunded / 100).toFixed(2);

        await sendRefundDetectedEmail({
          ownerEmail: ownerMembership.email,
          orgName,
          licenseId: affectedLicense.id,
          licenseKey: affectedLicense.key,
          productName: licenseDetails.productName,
          customerEmail: licenseDetails.customerEmail,
          customerName: licenseDetails.customerName ?? licenseDetails.customerEmail,
          refundAmount: `$${refundAmountFormatted}`,
        });

        event.set("email", {
          sent: true,
          type: "refund-detected",
          to: ownerMembership.email,
        });
      }
    } catch (emailError) {
      event.set("email", {
        sent: false,
        type: "refund-detected",
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  }
}

// ==================== Webhook Route ====================

export const Route = createFileRoute("/api/hooks/$organizationId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { organizationId } = params;

        return runWithTrace(
          {
            traceId: generateTraceId(),
            method: "POST",
            path: `/api/hooks/${organizationId}`,
            organizationId,
          },
          async () => {
            // Create ONE wide event for the entire webhook
            const event = createWideEvent("webhook.stripe");

            try {
              event.set("org.id", organizationId);

              if (!organizationId) {
                event.set("error", "missing_org_id");
                event.error(new Error("Organization ID is required"));
                return new Response(
                  JSON.stringify({ error: "Organization ID is required" }),
                  { status: 400, headers: { "Content-Type": "application/json" } }
                );
              }

              // Get organization
              const [org] = await db
                .select()
                .from(organization)
                .where(eq(organization.id, organizationId))
                .limit(1);

              if (!org) {
                event.set("error", "org_not_found");
                event.error(new Error("Organization not found"));
                return new Response(
                  JSON.stringify({ error: "Organization not found" }),
                  { status: 404, headers: { "Content-Type": "application/json" } }
                );
              }

              event.set("org.name", org.name);
              event.set("org.tier", org.subscriptionTier ?? "starter");

              if (!org.stripeWebhookSecret) {
                event.set("error", "webhook_not_configured");
                event.error(new Error("Webhook not configured"));
                return new Response(
                  JSON.stringify({ error: "Webhook not configured" }),
                  { status: 400, headers: { "Content-Type": "application/json" } }
                );
              }

              const payload = await request.text();
              const signature = request.headers.get("stripe-signature");

              if (!signature) {
                event.set("error", "missing_signature");
                event.error(new Error("Missing signature"));
                return new Response(
                  JSON.stringify({ error: "Missing signature" }),
                  { status: 400, headers: { "Content-Type": "application/json" } }
                );
              }

              // Verify webhook
              const stripeEvent = Stripe.webhooks.constructEvent(
                payload,
                signature,
                org.stripeWebhookSecret
              );

              event.set("stripe.event_id", stripeEvent.id);
              event.set("stripe.event_type", stripeEvent.type);
              event.set("stripe.is_test", !stripeEvent.livemode);

              if (!org.stripeAccessToken) {
                event.set("error", "stripe_not_connected");
                event.error(new Error("Stripe not connected"));
                return new Response(
                  JSON.stringify({ error: "Stripe not connected" }),
                  { status: 400, headers: { "Content-Type": "application/json" } }
                );
              }

              const stripe = new Stripe(org.stripeAccessToken, {
                apiVersion: "2025-02-24.acacia",
              });

              const isTest = !stripeEvent.livemode;

              // Handle event types
              switch (stripeEvent.type) {
                case "product.created": {
                  const stripeProduct = stripeEvent.data.object as Stripe.Product;
                  await handleProductCreated(event, { organizationId, stripeProduct });
                  break;
                }

                case "product.updated": {
                  const stripeProduct = stripeEvent.data.object as Stripe.Product;
                  await handleProductUpdated(event, { organizationId, stripeProduct });
                  break;
                }

                case "product.deleted": {
                  const stripeProduct = stripeEvent.data.object as Stripe.Product;
                  await handleProductDeleted(event, {
                    organizationId,
                    stripeProductId: stripeProduct.id,
                  });
                  break;
                }

                case "payment_intent.succeeded": {
                  const payment = stripeEvent.data.object as Stripe.PaymentIntent;

                  if (payment.invoice) {
                    event.set("skipped", true);
                    event.set("skip_reason", "invoice_handled_separately");
                    break;
                  }

                  if (!payment.customer) {
                    event.set("skipped", true);
                    event.set("skip_reason", "no_customer");
                    break;
                  }

                  const stripeProductId = payment.metadata?.product_id;
                  if (!stripeProductId) {
                    event.set("skipped", true);
                    event.set("skip_reason", "no_product_id_in_metadata");
                    break;
                  }

                  await createLicenseFromPayment(event, {
                    organizationId,
                    orgName: org.name,
                    stripeProductId,
                    stripeCustomerId: payment.customer as string,
                    stripePaymentIntentId: payment.id,
                    isTest,
                    metadata: payment.metadata,
                    stripe,
                  });
                  break;
                }

                case "invoice.payment_succeeded": {
                  const invoice = stripeEvent.data.object as Stripe.Invoice;

                  if (!invoice.customer) {
                    event.set("skipped", true);
                    event.set("skip_reason", "no_customer");
                    break;
                  }

                  const productIds = invoice.lines.data
                    .filter((line) => line.price?.product)
                    .map((line) => line.price?.product as string);

                  event.set("invoice.products_count", productIds.length);

                  for (const stripeProductId of productIds) {
                    await createLicenseFromPayment(event, {
                      organizationId,
                      orgName: org.name,
                      stripeProductId,
                      stripeCustomerId: invoice.customer as string,
                      stripePaymentIntentId: invoice.payment_intent as string,
                      isTest,
                      metadata: invoice.metadata ?? undefined,
                      stripe,
                    });
                  }
                  break;
                }

                case "charge.refunded": {
                  const charge = stripeEvent.data.object as Stripe.Charge;
                  await handleChargeRefunded(event, {
                    organizationId,
                    orgName: org.name,
                    charge,
                  });
                  break;
                }

                default:
                  event.set("unhandled", true);
              }

              // Update last tested timestamp
              await db
                .update(organization)
                .set({ webhookLastTestedAt: new Date() })
                .where(eq(organization.id, organizationId));

              // SUCCESS - emit the wide event
              event.success();

              return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            } catch (error) {
              // ERROR - emit the wide event with error
              event.error(error);

              return new Response(
                JSON.stringify({
                  error: error instanceof Error ? error.message : "Webhook Error",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }
          }
        );
      },
    },
  },
});
