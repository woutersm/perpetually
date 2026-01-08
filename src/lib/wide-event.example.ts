/**
 * EXAMPLE: Wide Events Applied to Webhook Handler
 *
 * This shows how to refactor from fragmented logging to wide events.
 * The key changes:
 *
 * 1. Create ONE event at request start
 * 2. Pass event through helper functions (or use context)
 * 3. Each function ADDS to the event instead of logging separately
 * 4. Emit ONCE at the end (success or error)
 *
 * BEFORE (fragmented - 12 log statements):
 * ```
 * logger.info("webhook:received", { org })
 * logger.debug("webhook:product:exists", { product })
 * logger.info("webhook:customer:created", { email })
 * logger.warn("webhook:license:limit-reached", { current, limit })
 * logger.info("webhook:license:created", { key, product, customer })
 * logger.info("webhook:email:sent", { type, to })
 * logger.info("webhook:processed", { eventType })
 * ```
 *
 * AFTER (wide event - 1 comprehensive event):
 * ```json
 * {
 *   "event": "webhook.payment",
 *   "trace_id": "abc123",
 *   "duration_ms": 234,
 *
 *   "org": { "id": "org-xxx", "name": "Acme", "tier": "pro" },
 *   "stripe": { "event_type": "payment_intent.succeeded", "event_id": "evt_xxx", "is_test": true },
 *
 *   "product": { "action": "found", "id": "prod-xxx", "name": "Pro Plan" },
 *   "customer": { "action": "created", "id": "cust-xxx", "email": "user@example.com" },
 *   "license": {
 *     "created": true,
 *     "id": "lic-xxx",
 *     "key": "XXXX-XXXX-XXXX-XXXX",
 *     "expires_days": 365,
 *     "activation_limit": 3,
 *     "limit_warning": true
 *   },
 *   "email": { "sent": true, "type": "license-created", "to": "user@example.com" },
 *
 *   "status": "success"
 * }
 * ```
 */

import type { WideEvent } from "./wide-event";
import { createWideEvent } from "./wide-event";

// ============================================================
// PATTERN 1: Helper functions receive the event builder
// ============================================================

interface ProductSyncResult {
  id: string;
  name: string;
  action: "created" | "found" | "updated";
}

async function handleProductCreatedWithEvent(
  event: WideEvent,
  params: { organizationId: string; stripeProduct: { id: string; name: string } }
): Promise<ProductSyncResult> {
  // Check if exists...
  const existing = null; // await db.query...

  if (existing) {
    // ADD to event instead of logging
    event.set("product", {
      action: "found",
      id: "existing-id",
      name: params.stripeProduct.name,
    });
    return { id: "existing-id", name: params.stripeProduct.name, action: "found" };
  }

  // Create product...
  const newProduct = { id: "new-id", name: params.stripeProduct.name };

  event.set("product", {
    action: "created",
    id: newProduct.id,
    name: newProduct.name,
  });

  return { ...newProduct, action: "created" };
}

async function handleCustomerWithEvent(
  event: WideEvent,
  params: { stripeCustomerId: string; email: string }
): Promise<{ id: string; email: string; action: string }> {
  // Check if exists by stripe ID...
  // Check if exists by email...
  // Create if needed...

  const customer = { id: "cust-xxx", email: params.email };
  const action = "created"; // or "found" or "linked"

  event.set("customer", {
    action,
    id: customer.id,
    email: customer.email,
  });

  return { ...customer, action };
}

async function createLicenseWithEvent(
  event: WideEvent,
  params: {
    organizationId: string;
    productId: string;
    customerId: string;
    limitCheck: { allowed: boolean; current: number; limit: number };
  }
): Promise<{ id: string; key: string }> {
  // Record limit warning if applicable
  if (!params.limitCheck.allowed) {
    event.set("license.limit_warning", true);
    event.set("license.limit_current", params.limitCheck.current);
    event.set("license.limit_max", params.limitCheck.limit);
  }

  // Create license...
  const license = {
    id: "lic-xxx",
    key: "XXXX-XXXX-XXXX-XXXX",
    expiresInDays: 365,
    activationLimit: 3,
  };

  event.set("license", {
    created: true,
    id: license.id,
    key: license.key,
    expires_days: license.expiresInDays,
    activation_limit: license.activationLimit,
    limit_warning: !params.limitCheck.allowed,
  });

  return { id: license.id, key: license.key };
}

async function sendEmailWithEvent(
  event: WideEvent,
  params: { to: string; type: string }
): Promise<void> {
  try {
    // await sendEmail(...)

    event.set("email", {
      sent: true,
      type: params.type,
      to: params.to,
    });
  } catch (err) {
    // Email failure shouldn't fail the webhook, but record it
    event.set("email", {
      sent: false,
      type: params.type,
      to: params.to,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ============================================================
// PATTERN 2: Main webhook handler using wide events
// ============================================================

export async function exampleWebhookHandler(params: {
  organizationId: string;
  stripeEvent: {
    id: string;
    type: string;
    livemode: boolean;
    data: { object: unknown };
  };
  org: { id: string; name: string; tier: string };
}) {
  // ONE event for the entire webhook processing
  const event = createWideEvent("webhook.payment");

  try {
    // Capture request context immediately
    event.set("org", {
      id: params.org.id,
      name: params.org.name,
      tier: params.org.tier,
    });

    event.set("stripe", {
      event_id: params.stripeEvent.id,
      event_type: params.stripeEvent.type,
      is_test: !params.stripeEvent.livemode,
    });

    // Process payment - each function ADDS to the event
    const payment = params.stripeEvent.data.object as {
      id: string;
      customer: string;
      metadata: { product_id: string };
    };

    // Skip conditions still need handling
    if (!payment.customer) {
      event.set("skipped", true);
      event.set("skip_reason", "no_customer");
      event.success();
      return { received: true, skipped: true };
    }

    // Sync product (adds product.* fields to event)
    await handleProductCreatedWithEvent(event, {
      organizationId: params.organizationId,
      stripeProduct: { id: payment.metadata.product_id, name: "Product" },
    });

    // Sync customer (adds customer.* fields to event)
    await handleCustomerWithEvent(event, {
      stripeCustomerId: payment.customer,
      email: "user@example.com",
    });

    // Check limits and create license (adds license.* fields to event)
    const limitCheck = { allowed: true, current: 5, limit: 100 };
    await createLicenseWithEvent(event, {
      organizationId: params.organizationId,
      productId: "prod-xxx",
      customerId: "cust-xxx",
      limitCheck,
    });

    // Send email (adds email.* fields to event)
    await sendEmailWithEvent(event, {
      to: "user@example.com",
      type: "license-created",
    });

    // SUCCESS - emit the wide event
    event.success();

    return { received: true };
  } catch (err) {
    // ERROR - emit the wide event with error info
    event.error(err);
    throw err;
  }
}

// ============================================================
// OUTPUT COMPARISON
// ============================================================

/**
 * BEFORE (12 separate log lines to correlate):
 *
 * 09:15:23.100 INFO webhook:received org=abc12345
 * 09:15:23.120 DEBUG webhook:product:exists product="Pro Plan"
 * 09:15:23.150 INFO webhook:customer:created email=user@example.com id=cust-xxx
 * 09:15:23.180 WARN webhook:license:limit-reached current=95 limit=100 tier=pro
 * 09:15:23.200 INFO webhook:license:created key=XXXX-XXXX product="Pro Plan" customer=user@example.com
 * 09:15:23.250 INFO webhook:email:sent type=license-created to=user@example.com
 * 09:15:23.300 INFO webhook:processed eventType=payment_intent.succeeded
 *
 * To debug: Need to grep for multiple patterns, manually correlate by timestamp
 *
 *
 * AFTER (1 wide event):
 *
 * Development (pretty):
 * 09:15:23 ✓ [abc12345] webhook.payment 200ms
 *   org: id=org-xxx name=Acme tier=pro
 *   stripe: event_type=payment_intent.succeeded event_id=evt_xxx is_test=true
 *   product: action=found id=prod-xxx name="Pro Plan"
 *   customer: action=created id=cust-xxx email=user@example.com
 *   license: created=true id=lic-xxx key=XXXX-XXXX expires_days=365 limit_warning=true
 *   email: sent=true type=license-created to=user@example.com
 *
 * Production (JSON):
 * {"event":"webhook.payment","trace_id":"abc12345","timestamp":"2025-01-04T09:15:23.300Z","duration_ms":200,"org":{"id":"org-xxx","name":"Acme","tier":"pro"},"stripe":{"event_type":"payment_intent.succeeded","event_id":"evt_xxx","is_test":true},"product":{"action":"found","id":"prod-xxx","name":"Pro Plan"},"customer":{"action":"created","id":"cust-xxx","email":"user@example.com"},"license":{"created":true,"id":"lic-xxx","key":"XXXX-XXXX","expires_days":365,"activation_limit":3,"limit_warning":true},"email":{"sent":true,"type":"license-created","to":"user@example.com"},"status":"success"}
 *
 * To debug: One query: event=webhook.payment AND status=error AND org.tier=pro
 */

// ============================================================
// QUERYING EXAMPLES (what becomes possible)
// ============================================================

/**
 * With wide events, you can now easily answer:
 *
 * 1. "How many licenses were created today?"
 *    → SELECT COUNT(*) WHERE event='webhook.payment' AND license.created=true AND timestamp > today
 *
 * 2. "What percentage of webhooks fail at the email stage?"
 *    → SELECT email.sent, COUNT(*) GROUP BY email.sent
 *
 * 3. "Show me all failed webhooks for pro tier orgs this week"
 *    → SELECT * WHERE event='webhook.payment' AND status='error' AND org.tier='pro'
 *
 * 4. "Which customers hit license limits?"
 *    → SELECT * WHERE license.limit_warning=true
 *
 * 5. "Average webhook processing time by event type"
 *    → SELECT stripe.event_type, AVG(duration_ms) GROUP BY stripe.event_type
 *
 * 6. "Find all webhooks for a specific customer"
 *    → SELECT * WHERE customer.email='user@example.com'
 *
 * None of this is possible with fragmented logs without massive manual effort.
 */
