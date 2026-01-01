# Design Document: Billing, Teams & Branding

> Phase 9 implementation plan for subscription billing, team members, and custom branding.

**Status**: Draft
**Author**: Claude
**Date**: December 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Feature 1: Billing & Subscriptions](#feature-1-billing--subscriptions)
3. [Feature 2: Team Members](#feature-2-team-members)
4. [Feature 3: Custom Branding](#feature-3-custom-branding)
5. [Schema Changes](#schema-changes)
6. [Implementation Order](#implementation-order)
7. [Open Questions](#open-questions)

---

## Overview

### Goals

1. **Billing**: Monetize Perpetually with Stripe subscriptions for our own pricing tiers
2. **Teams**: Allow Business tier orgs to invite team members with Owner/Member roles
3. **Branding**: Let Business tier orgs customize their customer portal and emails

### Pricing Tiers (Reference)

| Tier | Price | Licenses | Products | Team Members | Branding |
|------|-------|----------|----------|--------------|----------|
| Starter | $0/mo | 100 | 3 | 1 (owner only) | No |
| Pro | $29/mo | Unlimited | Unlimited | 1 (owner only) | No |
| Business | $99/mo | Unlimited | Unlimited | Unlimited | Yes |

### Key Decisions

- **Limit enforcement**: Hard block when Starter hits 100 licenses
- **Roles**: Simple model (Owner + Member)
- **Branding scope**: Portal + Emails (no custom domains in v1)
- **Multi-org**: Users can belong to multiple organizations

---

## Feature 1: Billing & Subscriptions

### 1.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Perpetually                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Organization                                               │
│  ├── subscriptionStatus: 'trialing' | 'active' | 'past_due' │
│  ├── subscriptionTier: 'starter' | 'pro' | 'business'       │
│  ├── stripeCustomerId: 'cus_xxx' (for billing Perpetually)  │
│  ├── stripeSubscriptionId: 'sub_xxx'                        │
│  └── currentPeriodEnd: Date                                 │
│                                                             │
│  Note: This is SEPARATE from the org's own Stripe account   │
│  used to sell their software licenses.                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Important Distinction**:
- `organization.stripeApiKey` = Customer's Stripe account (for selling their licenses)
- `organization.stripeCustomerId` = Perpetually's Stripe account (for billing them)

### 1.2 Stripe Setup

Create in Perpetually's Stripe dashboard:

```
Products:
├── prod_starter (Starter - Free)
│   └── price_starter_monthly: $0/month
├── prod_pro (Pro)
│   └── price_pro_monthly: $29/month
└── prod_business (Business)
    └── price_business_monthly: $99/month
```

Environment variables:
```bash
# Perpetually's own Stripe keys (for billing customers)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_BUSINESS=price_xxx
```

### 1.3 Subscription Lifecycle

```
                    ┌──────────────┐
                    │   Register   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Starter    │ (Free, 100 licenses, 3 products)
                    │   (Default)  │
                    └──────┬───────┘
                           │
                           │ "Start 14-day trial"
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌──────────────┐         ┌──────────────┐
       │  Pro Trial   │         │ Business     │
       │  (14 days)   │         │ Trial (14d)  │
       └──────┬───────┘         └──────┬───────┘
              │                         │
              │ Trial ends              │ Trial ends
              ▼                         ▼
       ┌──────────────┐         ┌──────────────┐
       │  Pro Active  │         │   Business   │
       │   $29/mo     │         │   $99/mo     │
       └──────┬───────┘         └──────┬───────┘
              │                         │
              │    ┌───────────┐        │
              └───►│  Billing  │◄───────┘
                   │  Portal   │
                   └───────────┘
                   (Stripe Customer Portal)
```

**Trial Flow**:
- User selects Pro or Business, enters payment method
- Stripe creates subscription with `trial_period_days: 14`
- Card is validated but not charged until trial ends
- 3 days before trial ends: Send reminder email
- Trial ends: Card is charged, subscription becomes active
- If card fails: Falls back to Starter tier

### 1.4 Limit Enforcement

**When to check limits**:
1. Creating a license (via webhook or manual if re-enabled)
2. Creating a product mapping
3. Inviting a team member

**Enforcement logic**:

```typescript
// src/lib/limits.ts

export const TIER_LIMITS = {
  starter: { licenses: 100, products: 3, members: 1 },
  pro: { licenses: Infinity, products: Infinity, members: 1 },
  business: { licenses: Infinity, products: Infinity, members: Infinity },
} as const;

export async function checkLicenseLimit(orgId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
}> {
  const org = await getOrganization(orgId);
  const tier = org.subscriptionTier ?? 'starter';
  const limits = TIER_LIMITS[tier];

  const licenseCount = await db
    .select({ count: count() })
    .from(license)
    .where(eq(license.organizationId, orgId));

  return {
    allowed: licenseCount < limits.licenses,
    current: licenseCount,
    limit: limits.licenses,
    tier,
  };
}
```

**UI feedback when blocked**:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  License Limit Reached                          │
│                                                     │
│  You've used 100/100 licenses on the Starter plan.  │
│                                                     │
│  To create more licenses:                           │
│  • Delete unused licenses, or                       │
│  • Upgrade to Pro for unlimited licenses            │
│                                                     │
│  [Manage Licenses]  [Upgrade to Pro →]              │
└─────────────────────────────────────────────────────┘
```

### 1.5 Billing UI Components

**Settings Page Addition**:

```
/settings
├── General (existing)
├── Stripe Integration (existing)
├── API Keys (existing)
└── Billing (NEW)
    ├── Current Plan: Pro ($29/mo)
    ├── Usage: 47 licenses, 5 products
    ├── Next billing: Jan 15, 2025
    ├── [Change Plan] → Opens plan comparison modal
    └── [Manage Billing →] → Stripe Customer Portal
```

**Upgrade Flow**:

1. User clicks "Upgrade" from limit warning or settings
2. Show plan comparison modal
3. Redirect to Stripe Checkout with selected plan
4. Webhook updates `subscriptionTier` on success
5. Redirect back to app with success toast

### 1.6 Webhook Handlers

New webhook endpoint for Perpetually billing (separate from customer webhooks):

```typescript
// src/routes/api/billing/webhook.ts

// Handle these events:
// - checkout.session.completed → Create/update subscription
// - customer.subscription.updated → Tier change, renewal
// - customer.subscription.deleted → Downgrade to Starter
// - invoice.payment_failed → Set status to 'past_due'
// - invoice.paid → Clear 'past_due' status
```

### 1.7 Downgrade Handling

When org downgrades from Pro/Business to Starter:

1. **Don't delete data** - existing licenses remain
2. **Block new creation** - can't create licenses over limit
3. **Show warning** - "You have 150 licenses but Starter allows 100. Delete 50 or upgrade to create more."
4. **Team members** - Keep existing, block new invites

---

## Feature 2: Team Members

### 2.1 Data Model

Currently, Better Auth handles users and sessions. We need to extend the membership model:

```typescript
// Current schema
membership: {
  id,
  userId,
  organizationId,
  role: 'owner' | 'admin' | 'member', // Already exists
  createdAt,
}

// We'll use existing role field:
// - 'owner': Full access, can manage billing and delete org
// - 'member': Can manage licenses, products, customers (no billing/team mgmt)
```

### 2.2 Permission Matrix

| Action | Owner | Member |
|--------|-------|--------|
| View dashboard | ✅ | ✅ |
| View/manage licenses | ✅ | ✅ |
| View/manage products | ✅ | ✅ |
| View/manage customers | ✅ | ✅ |
| View API keys | ✅ | ✅ |
| Create/revoke API keys | ✅ | ❌ |
| Manage Stripe integration | ✅ | ❌ |
| Invite/remove team members | ✅ | ❌ |
| View/manage billing | ✅ | ❌ |
| Change branding | ✅ | ❌ |
| Delete organization | ✅ | ❌ |

### 2.3 Invitation Flow

```
Owner clicks "Invite Member"
         │
         ▼
┌─────────────────────────┐
│  Enter email address    │
│  [john@example.com   ]  │
│                         │
│  [Cancel]  [Send Invite]│
└─────────────────────────┘
         │
         ▼
Create invitation record
         │
         ▼
Send email with magic link
/invite/accept?token=xxx
         │
         ▼
┌─────────────────────────┐
│  If user exists:        │  ──► Add to org, redirect to dashboard
│  If new user:           │  ──► Create account, add to org, redirect
└─────────────────────────┘
```

### 2.4 Invitation Schema

```typescript
// New table
export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["member"] }).notNull().default("member"),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  invitedBy: text("invited_by").notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
});
```

### 2.5 Team Management UI

**Settings → Team page** (Business tier only):

```
┌─────────────────────────────────────────────────────────────┐
│  Team Members                              [Invite Member]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 Jane Smith (you)                                        │
│     jane@company.com · Owner · Joined Dec 1, 2024          │
│                                                             │
│  👤 John Doe                                    [Remove ▼]  │
│     john@company.com · Member · Joined Dec 15, 2024        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Pending Invitations                                        │
│                                                             │
│  📧 sarah@company.com              [Resend] [Cancel]        │
│     Invited Dec 20, 2024 · Expires in 5 days               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.6 Organization Switcher

Since users can be in multiple orgs, add switcher to sidebar:

```
┌──────────────────────────┐
│  Acme Inc            ▼   │  ◄── Clicking opens dropdown
├──────────────────────────┤
│  ✓ Acme Inc              │
│    DevTools Co           │
│    ──────────────────    │
│    + Create Organization │
└──────────────────────────┘
```

Better Auth already supports this via `organization.setActive()`.

---

## Feature 3: Custom Branding

### 3.1 Branding Options

| Element | Customizable | Storage |
|---------|--------------|---------|
| Logo | Yes (URL or upload) | S3/R2 or URL |
| Accent color | Yes (hex) | Database |
| Company name | Yes (already exists) | Database |
| Support email | Yes | Database |
| Portal "Powered by" | Hideable (Business) | Database |
| Email header logo | Yes | Same as portal logo |
| Email accent color | Yes | Same as portal |

### 3.2 Schema Addition

```typescript
// Add to organization table
export const organization = sqliteTable("organization", {
  // ... existing fields

  // Branding (Business tier)
  brandingEnabled: integer("branding_enabled", { mode: "boolean" }).default(false),
  brandLogo: text("brand_logo"), // URL to logo image
  brandAccentColor: text("brand_accent_color"), // Hex color, e.g., "#FF6B35"
  brandSupportEmail: text("brand_support_email"),
  brandHidePoweredBy: integer("brand_hide_powered_by", { mode: "boolean" }).default(false),
});
```

### 3.3 Branding Settings UI

**Settings → Branding** (Business tier only):

```
┌─────────────────────────────────────────────────────────────┐
│  Portal Branding                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Logo                                                       │
│  ┌────────────┐                                            │
│  │   [Logo]   │  [Upload]  [Use URL instead]               │
│  └────────────┘                                            │
│  Recommended: 200x50px, PNG or SVG                         │
│                                                             │
│  Accent Color                                               │
│  [#FF6B35] [████]  ◄── Color picker                        │
│                                                             │
│  Support Email                                              │
│  [support@yourcompany.com]                                  │
│  Shown in portal footer and emails                         │
│                                                             │
│  □ Hide "Powered by Perpetually" badge                     │
│                                                             │
│  ─────────────────────────────────────────────────         │
│                                                             │
│  Preview                                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │  [Your Logo]              Customer Portal   │           │
│  │  ─────────────────────────────────────────  │           │
│  │  Welcome back, John                         │           │
│  │  [██████████] Pro License - Active          │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  [Save Changes]                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Portal Branding Implementation

**Dynamic CSS variables approach**:

```typescript
// src/routes/portal/$slug/$customerId.tsx

function PortalLayout({ org, children }) {
  const brandStyles = org.brandingEnabled ? {
    '--brand-accent': org.brandAccentColor || 'hsl(24, 95%, 53%)',
  } : {};

  return (
    <div style={brandStyles}>
      <header>
        {org.brandingEnabled && org.brandLogo ? (
          <img src={org.brandLogo} alt={org.name} className="h-8" />
        ) : (
          <DefaultLogo />
        )}
      </header>

      {children}

      <footer>
        {org.brandSupportEmail && (
          <p>Questions? Contact {org.brandSupportEmail}</p>
        )}
        {!org.brandHidePoweredBy && (
          <p className="text-muted">Powered by Perpetually</p>
        )}
      </footer>
    </div>
  );
}
```

### 3.5 Email Branding

Update email templates to accept branding:

```typescript
// src/lib/email/templates.ts

export function licenseCreatedEmail({
  customerName,
  licenseKey,
  productName,
  // ... existing params

  // Branding params
  brandLogo,
  brandAccentColor,
  brandSupportEmail,
  orgName,
}) {
  const accentColor = brandAccentColor || '#FF6B35';
  const logo = brandLogo
    ? `<img src="${brandLogo}" alt="${orgName}" style="max-height: 40px;" />`
    : `<span style="font-weight: bold;">${orgName}</span>`;

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <header style="padding: 20px; background: ${accentColor}10; text-align: center;">
        ${logo}
      </header>

      <main style="padding: 30px;">
        <h1>Your License Key</h1>
        <p>Hi ${customerName},</p>
        ...
      </main>

      <footer style="padding: 20px; text-align: center; color: #666;">
        ${brandSupportEmail
          ? `Questions? Contact <a href="mailto:${brandSupportEmail}">${brandSupportEmail}</a>`
          : ''
        }
      </footer>
    </div>
  `;
}
```

### 3.6 Logo Storage

**Option A: URL only** (simpler)
- User provides URL to their hosted logo
- We just store the URL
- Risk: URL can break if they move/delete it

**Option B: File upload** (more robust)
- Upload to S3/Cloudflare R2
- Store object key in database
- Serve via signed URLs or public bucket

**Recommendation**: Start with URL only, add upload later if needed.

---

## Schema Changes

### Complete Migration

```typescript
// New fields for organization table
alter table organization add column subscription_status text default 'active';
alter table organization add column subscription_tier text default 'starter';
alter table organization add column stripe_customer_id text; -- For Perpetually billing
alter table organization add column stripe_subscription_id text;
alter table organization add column current_period_end integer;

alter table organization add column branding_enabled integer default 0;
alter table organization add column brand_logo text;
alter table organization add column brand_accent_color text;
alter table organization add column brand_support_email text;
alter table organization add column brand_hide_powered_by integer default 0;

-- New invitation table
create table invitation (
  id text primary key,
  organization_id text not null references organization(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null unique,
  expires_at integer not null,
  invited_by text not null references user(id),
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);
```

---

## Implementation Order

### Phase 9A: Billing Foundation (3-4 days)

1. Schema: Add subscription fields to organization
2. Create `/settings/billing` page with current plan display
3. Environment setup for Perpetually's Stripe keys
4. Stripe Checkout integration for upgrades
5. Webhook handler for subscription events
6. Stripe Customer Portal link for billing management

### Phase 9B: Limit Enforcement (1-2 days)

1. Create `src/lib/limits.ts` with tier constants
2. Add limit check middleware for license creation
3. Add limit check for product creation
4. UI: Upgrade prompts when limits reached
5. UI: Usage display in settings

### Phase 9C: Team Members (2-3 days)

1. Schema: Create invitation table
2. Invitation email template
3. `/settings/team` page (Business only)
4. Invite flow: create invitation, send email
5. Accept flow: `/invite/accept` route
6. Team member removal
7. Organization switcher in sidebar (if user has multiple orgs)

### Phase 9D: Custom Branding (2-3 days)

1. Schema: Add branding fields to organization
2. `/settings/branding` page (Business only)
3. Logo URL input with preview
4. Accent color picker
5. Portal: Apply branding dynamically
6. Emails: Pass branding to all templates
7. "Powered by" toggle

### Total Estimate: 8-12 days

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Trial period | **14-day free trial** for Pro/Business |
| Logo upload | **URL-only** (simpler, user provides hosted URL) |

## Open Questions

1. **Annual billing**: Offer discount for annual payment? (Common: 2 months free)

2. **Grandfathering**: If we change prices later, do existing customers keep old price?

3. **Grace period**: How long after failed payment before downgrade? (Suggest: 7 days)

4. **Email sender**: Should branded emails come from their domain or always from Perpetually?

---

## Appendix: File Changes

### New Files
- `src/routes/api/billing/webhook.ts` - Perpetually billing webhooks
- `src/routes/_auth/settings/billing.tsx` - Billing settings page
- `src/routes/_auth/settings/team.tsx` - Team management page
- `src/routes/_auth/settings/branding.tsx` - Branding settings page
- `src/routes/invite/accept.tsx` - Invitation acceptance page
- `src/lib/limits.ts` - Tier limits and enforcement
- `src/lib/billing.ts` - Stripe billing helpers
- `src/functions/invitations.ts` - Invitation server functions
- `src/functions/billing.ts` - Billing server functions
- `src/components/org-switcher.tsx` - Organization switcher component
- `src/components/upgrade-modal.tsx` - Plan comparison/upgrade modal

### Modified Files
- `src/lib/db/schema.ts` - New fields and invitation table
- `src/lib/email/templates.ts` - Add branding support
- `src/lib/email/notifications.ts` - Pass branding to templates
- `src/routes/portal/$slug/$customerId.tsx` - Apply portal branding
- `src/routes/_auth/settings/route.tsx` - Add new settings tabs
- `src/routes/api/hooks/$organizationId.ts` - Add limit check before license creation
- `src/components/sidebar.tsx` - Add org switcher
