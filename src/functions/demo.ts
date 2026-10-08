import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import db from "@/lib/db/db";
import { customer, license, product, secretKey } from "@/lib/db/schema";
import authMiddleware from "@/middleware/auth";
import { wideEventMiddleware } from "@/middleware/wide-event";
import { createSandbox, isDemoMode } from "@/lib/demo/sandbox";
import { issueLicense } from "@/lib/services/license";

// Public runtime config (read by the landing/login pages)
export const getAppConfig = createServerFn({ method: "GET" }).handler(async () => ({
  demoMode: isDemoMode(),
}));

// Simple in-memory rate limit: sandboxes per IP per hour
const SANDBOXES_PER_IP_PER_HOUR = 10;
const sandboxRequests = new Map<string, number[]>();

function checkRateLimit(ip: string) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = (sandboxRequests.get(ip) ?? []).filter((t) => t > hourAgo);
  if (recent.length >= SANDBOXES_PER_IP_PER_HOUR) return false;
  recent.push(Date.now());
  sandboxRequests.set(ip, recent);
  return true;
}

/**
 * Create a private sandbox for this visitor. Returns throwaway credentials
 * the client uses to sign in through the normal Better Auth flow.
 */
export const startDemo = createServerFn({ method: "POST" })
  .middleware([wideEventMiddleware("demo.start")])
  .handler(async ({ context: { event } }) => {
    if (!isDemoMode()) throw new Error("Demo mode is not enabled");

    const headers = getRequestHeaders();
    const ip = headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!checkRateLimit(ip)) {
      throw new Error("Too many demo sandboxes from your network. Try again in an hour.");
    }

    const sandbox = await createSandbox();
    event.set("sandbox.expires_at", sandbox.expiresAt.toISOString());
    return { email: sandbox.email, password: sandbox.password };
  });

function requireSandbox(org: { sandboxExpiresAt?: Date | null }) {
  if (!org.sandboxExpiresAt) throw new Error("Only available in demo sandboxes");
}

const BUYERS = [
  ["Robin", "Mertens"], ["Sasha", "Ivanova"], ["Jonas", "Berg"], ["Amara", "Diallo"],
  ["Felix", "Wagner"], ["Lotte", "Peeters"], ["Mateo", "Ruiz"], ["Hana", "Sato"],
] as const;

/**
 * Simulate a Stripe `payment_intent.succeeded` for a product: creates (or
 * reuses) a customer and issues a license through the same service the
 * real webhook uses.
 */
export const simulatePurchase = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("demo.simulate_purchase")])
  .inputValidator(
    (data: { productId: string; customerId?: string; isTestMode?: boolean }) => data
  )
  .handler(async ({ data, context: { organizationId, organization, event } }) => {
    requireSandbox(organization);

    const [prod] = await db
      .select()
      .from(product)
      .where(and(eq(product.id, data.productId), eq(product.organizationId, organizationId)))
      .limit(1);
    if (!prod) throw new Error("Product not found");

    let buyer;
    if (data.customerId) {
      [buyer] = await db
        .select()
        .from(customer)
        .where(and(eq(customer.id, data.customerId), eq(customer.organizationId, organizationId)))
        .limit(1);
      if (!buyer) throw new Error("Customer not found");
    } else {
      const [first, last] = BUYERS[Math.floor(Math.random() * BUYERS.length)];
      const suffix = crypto.randomUUID().slice(0, 4);
      [buyer] = await db
        .insert(customer)
        .values({
          name: `${first} ${last}`,
          email: `${first}.${last}.${suffix}@example.com`.toLowerCase(),
          stripeCustomerId: `cus_sim_${suffix}`,
          syncedAt: new Date(),
          organizationId,
        })
        .returning();
    }

    const paymentIntentId = `pi_sim_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const result = await issueLicense({
      organizationId,
      productId: prod.id,
      customerId: buyer.id,
      stripePaymentIntentId: paymentIntentId,
      isTest: data.isTestMode ?? false,
      eventData: { simulated: true, stripeProductId: prod.stripeProductId },
    });

    event.set("stripe.payment_intent", paymentIntentId);
    event.set("license.id", result.license.id);

    return {
      paymentIntentId,
      customer: { id: buyer.id, name: buyer.name, email: buyer.email },
      product: { id: prod.id, name: prod.name },
      license: {
        id: result.license.id,
        key: result.license.key,
        expiresAt: result.expiresAt,
        activationLimit: result.activationLimit,
      },
    };
  });

/** Data for the API playground: the sandbox's secret key and its licenses */
export const getPlaygroundData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId, organization } }) => {
    requireSandbox(organization);

    const [key] = await db
      .select({ key: secretKey.key })
      .from(secretKey)
      .where(eq(secretKey.organizationId, organizationId))
      .limit(1);

    const licenses = await db
      .select({
        id: license.id,
        key: license.key,
        status: license.status,
        expiresAt: license.expiresAt,
        activationLimit: license.activationLimit,
        productName: product.name,
        customerName: customer.name,
      })
      .from(license)
      .innerJoin(product, eq(license.productId, product.id))
      .innerJoin(customer, eq(license.customerId, customer.id))
      .where(eq(license.organizationId, organizationId))
      .orderBy(desc(license.createdAt))
      .limit(50);

    return { apiKey: key?.key ?? null, licenses };
  });

export const getSimulatorOptions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { organizationId, organization } }) => {
    requireSandbox(organization);
    const [products, customers] = await Promise.all([
      db
        .select({ id: product.id, name: product.name })
        .from(product)
        .where(eq(product.organizationId, organizationId)),
      db
        .select({ id: customer.id, name: customer.name, email: customer.email })
        .from(customer)
        .where(eq(customer.organizationId, organizationId))
        .orderBy(customer.name),
    ]);
    return { products, customers };
  });
