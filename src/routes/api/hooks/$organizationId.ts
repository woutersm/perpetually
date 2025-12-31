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

async function handleProductCreated({
  organizationId,
  stripeProduct,
}: {
  organizationId: string;
  stripeProduct: Stripe.Product;
}) {
  // Check if product already exists
  const [existing] = await db
    .select()
    .from(product)
    .where(eq(product.stripeProductId, stripeProduct.id))
    .limit(1);

  if (existing) {
    console.log("Product already exists, skipping:", stripeProduct.name);
    return existing;
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

  console.log("Created product from webhook:", newProduct.name);
  return newProduct;
}

async function handleProductUpdated({
  organizationId,
  stripeProduct,
}: {
  organizationId: string;
  stripeProduct: Stripe.Product;
}) {
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
    // Product doesn't exist locally, create it
    return handleProductCreated({ organizationId, stripeProduct });
  }

  // Update existing product
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

  console.log("Updated product from webhook:", updated.name);
  return updated;
}

async function handleProductDeleted({
  organizationId,
  stripeProductId,
}: {
  organizationId: string;
  stripeProductId: string;
}) {
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
    console.log("Product not found for deletion:", stripeProductId);
    return null;
  }

  // Soft delete: mark as inactive
  const [updated] = await db
    .update(product)
    .set({
      isActive: false,
      syncedAt: new Date(),
    })
    .where(eq(product.id, existing.id))
    .returning();

  console.log("Deactivated product from webhook:", updated.name);
  return updated;
}

// ==================== Customer Sync ====================

async function findOrCreateCustomer({
  organizationId,
  stripeCustomerId,
  stripe,
}: {
  organizationId: string;
  stripeCustomerId: string;
  stripe: Stripe;
}) {
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
    return localCustomer;
  }

  // Fetch customer details from Stripe
  const stripeCustomer = (await stripe.customers.retrieve(
    stripeCustomerId
  )) as Stripe.Customer;

  if (stripeCustomer.deleted) {
    console.error("Stripe customer is deleted:", stripeCustomerId);
    return null;
  }

  if (!stripeCustomer.email) {
    console.error("Stripe customer has no email:", stripeCustomerId);
    return null;
  }

  // Check if customer exists by email (might exist from before stripeCustomerId was tracked)
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
    // Update with stripeCustomerId
    const [updated] = await db
      .update(customer)
      .set({
        stripeCustomerId,
        name: stripeCustomer.name || localCustomer.name,
        syncedAt: new Date(),
      })
      .where(eq(customer.id, localCustomer.id))
      .returning();

    console.log("Updated customer with Stripe ID:", updated.email);
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

  console.log("Created customer from webhook:", newCustomer.email);
  return newCustomer;
}

// ==================== License Creation ====================

async function createLicenseFromPayment({
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
}) {
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
    // Try to get product info from Stripe
    const stripeProduct = await stripe.products.retrieve(stripeProductId);
    localProduct = await handleProductCreated({
      organizationId,
      stripeProduct,
    });
  }

  // Find or create local customer
  const localCustomer = await findOrCreateCustomer({
    organizationId,
    stripeCustomerId,
    stripe,
  });

  if (!localCustomer) {
    console.error("Could not create or find customer");
    return null;
  }

  // Read metadata overrides
  const activationLimitOverride = metadata?.perpetually_activation_limit
    ? parseInt(metadata.perpetually_activation_limit, 10)
    : undefined;
  const licenseDurationDaysOverride = metadata?.perpetually_license_duration_days
    ? parseInt(metadata.perpetually_license_duration_days, 10)
    : undefined;

  // Try to get default policy for this product
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

  // Calculate final values (override > policy > default)
  const activationLimit =
    activationLimitOverride ?? defaultActivationLimit ?? null;
  const licenseDurationDays =
    licenseDurationDaysOverride ?? defaultLicenseDays ?? 365;

  // Create license
  const key = generateLicenseKey();
  const now = new Date();
  const expiresAt =
    licenseDurationDays === null || licenseDurationDays === 0
      ? null // Perpetual license
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

  console.log("Created license from webhook:", {
    key: newLicense.key,
    product: localProduct.name,
    customer: localCustomer.email,
    isTest,
  });

  // Log license.created event
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

  // Send license created email to customer
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
      console.log("License created email sent to:", localCustomer.email);
    } catch (emailError) {
      // Don't fail the webhook if email fails
      console.error("Failed to send license created email:", emailError);
    }
  }

  return newLicense;
}

// ==================== Refund Handler ====================

async function handleChargeRefunded({
  organizationId,
  orgName,
  charge,
}: {
  organizationId: string;
  orgName: string;
  charge: Stripe.Charge;
}) {
  const paymentIntentId = charge.payment_intent as string | null;

  if (!paymentIntentId) {
    console.log("Refund has no payment intent, skipping");
    return;
  }

  // Find license by payment intent ID
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
    console.log("No license found for refunded payment:", paymentIntentId);
    return;
  }

  // Log the refund event (do NOT auto-disable - owner decides)
  await db.insert(licenseEvent).values({
    type: "license.status_changed",
    actorType: "system",
    actorId: null,
    data: {
      event: "refund_detected",
      stripeChargeId: charge.id,
      refundAmount: charge.amount_refunded,
      refundReason: charge.refunds?.data?.[0]?.reason ?? "unknown",
      message:
        "Refund detected. License NOT automatically disabled - review and take action if needed.",
    },
    licenseId: affectedLicense.id,
    organizationId,
  });

  console.log("Refund detected for license:", {
    licenseKey: affectedLicense.key,
    chargeId: charge.id,
    amountRefunded: charge.amount_refunded,
  });

  // Send email notification to org owner
  if (isEmailConfigured()) {
    try {
      // Get org owner email
      const [ownerMembership] = await db
        .select({
          email: user.email,
          name: user.name,
        })
        .from(membership)
        .innerJoin(user, eq(membership.userId, user.id))
        .where(
          and(
            eq(membership.organizationId, organizationId),
            eq(membership.role, "owner")
          )
        )
        .limit(1);

      // Get license details with product and customer
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
        console.log("Refund notification email sent to:", ownerMembership.email);
      }
    } catch (emailError) {
      // Don't fail the webhook if email fails
      console.error("Failed to send refund notification email:", emailError);
    }
  }
}

// ==================== Webhook Route ====================

export const Route = createFileRoute("/api/hooks/$organizationId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { organizationId } = params;

        console.log("Webhook received for organization:", organizationId);

        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: "Organization ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Get organization
        const [org] = await db
          .select()
          .from(organization)
          .where(eq(organization.id, organizationId))
          .limit(1);

        if (!org) {
          return new Response(
            JSON.stringify({ error: "Organization not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        if (!org.stripeWebhookSecret) {
          return new Response(
            JSON.stringify({ error: "Webhook not configured" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const payload = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
          return new Response(JSON.stringify({ error: "Missing signature" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          // Verify webhook signature
          const event = Stripe.webhooks.constructEvent(
            payload,
            signature,
            org.stripeWebhookSecret
          );

          if (!org.stripeAccessToken) {
            console.error(
              "Stripe not connected for organization:",
              organizationId
            );
            return new Response(
              JSON.stringify({ error: "Stripe not connected" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const stripe = new Stripe(org.stripeAccessToken, {
            apiVersion: "2025-02-24.acacia",
          });

          // Extract test mode from event (invert livemode)
          const isTest = !event.livemode;

          // Handle different event types
          switch (event.type) {
            // ==================== Product Events ====================
            case "product.created": {
              const stripeProduct = event.data.object as Stripe.Product;
              await handleProductCreated({ organizationId, stripeProduct });
              break;
            }

            case "product.updated": {
              const stripeProduct = event.data.object as Stripe.Product;
              await handleProductUpdated({ organizationId, stripeProduct });
              break;
            }

            case "product.deleted": {
              const stripeProduct = event.data.object as Stripe.Product;
              await handleProductDeleted({
                organizationId,
                stripeProductId: stripeProduct.id,
              });
              break;
            }

            // ==================== Payment Events ====================
            case "payment_intent.succeeded": {
              const payment = event.data.object as Stripe.PaymentIntent;

              // Skip if this is part of an invoice (handled by invoice.payment_succeeded)
              if (payment.invoice) {
                console.log("Payment is part of invoice, skipping");
                break;
              }

              if (!payment.customer) {
                console.log("Payment has no customer, skipping");
                break;
              }

              const stripeProductId = payment.metadata?.product_id;
              if (!stripeProductId) {
                console.log("Payment has no product_id in metadata, skipping");
                break;
              }

              await createLicenseFromPayment({
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
              const invoice = event.data.object as Stripe.Invoice;

              if (!invoice.customer) {
                console.log("Invoice has no customer, skipping");
                break;
              }

              // Get product IDs from line items
              const productIds = invoice.lines.data
                .filter((line) => line.price?.product)
                .map((line) => line.price?.product as string);

              for (const stripeProductId of productIds) {
                await createLicenseFromPayment({
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

            // ==================== Refund Events ====================
            case "charge.refunded": {
              const charge = event.data.object as Stripe.Charge;
              await handleChargeRefunded({ organizationId, orgName: org.name, charge });
              break;
            }

            default:
              console.log("Unhandled event type:", event.type);
          }

          console.log("Webhook processed successfully:", event.type);

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Webhook error:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Webhook Error",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
