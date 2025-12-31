# Perpetually - Product Blueprint

> License management SaaS that integrates with Stripe to automatically create and manage licenses for software products.

**Last Updated**: December 2024
**Status**: Document First (Blueprint for future implementation)

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [Core Principles](#core-principles)
3. [Target Customer](#target-customer)
4. [Architecture](#architecture)
5. [Entity Model](#entity-model)
6. [State Machines](#state-machines)
7. [Audit Trail](#audit-trail)
8. [User Flows](#user-flows)
9. [System Flows](#system-flows)
10. [API Design](#api-design)
11. [Customer Portal](#customer-portal)
12. [Features to Build](#features-to-build)
13. [Features to Remove](#features-to-remove)
14. [Open Questions](#open-questions)
15. [Implementation Phases](#implementation-phases)

---

## Product Vision

**Perpetually** enables software companies to automatically generate and manage license keys for their products through Stripe integration. When a customer makes a purchase, a license is automatically created and can be managed through a dashboard, validated via API, and self-serviced by end-users.

### One-Line Summary
> Stripe handles payments. Perpetually handles licenses.

### Key Value Propositions
1. **Zero manual work** - Licenses created automatically on sale
2. **Full control** - Manage, suspend, revoke, extend licenses
3. **Self-service** - End-users manage their own activations
4. **Developer-friendly** - Simple API for validation and activation

---

## Core Principles

### 1. Stripe as Source of Truth for Commerce
- **Products** come from Stripe (synced, not manually created)
- **Customers** come from Stripe (synced on purchase)
- **Payments** trigger license creation

### 2. Perpetually as Source of Truth for Licensing
- **Licenses** are owned and managed by Perpetually
- **Activations** tracked and enforced by Perpetually
- **Policies** configured in Perpetually (with Stripe metadata overrides)

### 3. Opinionated Simplicity
- One-time purchases only (no subscription complexity)
- All licenses come from Stripe payments (live or test mode)
- No manual entity creation (products, customers, licenses)

### 4. Test Mode via Stripe
- Stripe test mode = test licenses (flagged with `isTest`)
- Same code path, same webhooks, no money
- UI toggle to show/hide test data

---

## Target Customer

### Who
- **All stages**: Early-stage to established software companies
- **Product types**: Desktop apps, plugins, native software, one-time purchase SaaS
- **Tech level**: Mix of developers (API-first) and non-technical founders (dashboard-first)

### What They Sell
- One-time purchase software (perpetual licenses)
- Desktop applications
- Plugins and extensions
- SDK/API access with usage caps

### What They Need
- Automatic license generation on sale
- Activation limits (device restrictions)
- Customer self-service portal
- API for license validation in their products

---

## Architecture

### Source of Truth Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           STRIPE                                 │
│                   (Source of Truth: Commerce)                    │
│                                                                  │
│  Products ────────────────────────────────────────────────────┐ │
│  Customers ───────────────────────────────────────────────────┤ │
│  Payments ────────────────────────────────────────────────────┤ │
│  Metadata (license config overrides) ────────────────────────┤ │
└───────────────────────────────────────────────────────────────┼─┘
                                                                 │
                            Webhooks                             │
                                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PERPETUALLY                               │
│                  (Source of Truth: Licensing)                    │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Products   │    │  Customers  │    │  License    │         │
│  │  (synced)   │    │  (synced)   │    │  Policies   │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            ▼                                    │
│                    ┌─────────────┐                              │
│                    │  Licenses   │ ← Created on payment         │
│                    │  (owned)    │ ← Managed via dashboard      │
│                    └──────┬──────┘                              │
│                           │                                     │
│                           ▼                                     │
│                    ┌─────────────┐                              │
│                    │ Activations │ ← Created via API            │
│                    │  (owned)    │ ← Managed by end-users       │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Strategy

| Entity | Sync Direction | Trigger |
|--------|---------------|---------|
| Product | Stripe → Perpetually | Initial import + `product.created/updated` webhook |
| Customer | Stripe → Perpetually | `payment_intent.succeeded` (auto-create if missing) |
| License | Created in Perpetually | `payment_intent.succeeded` webhook |
| Activation | Created in Perpetually | API call from customer's product |

---

## Entity Model

### Core Entities

```
Organization (tenant)
├── Products (synced from Stripe)
│   └── LicensePolicy (defaults for licenses)
├── Customers (synced from Stripe)
├── Licenses (created on payment)
│   └── Activations (device registrations)
└── SecretKeys (API authentication)
```

### Entity Details

#### Organization
```typescript
{
  id: string
  name: string
  slug: string (unique)
  apiKey: string (pk_xxx - public identifier)
  isOnboarded: boolean

  // Stripe Connect
  stripeConnectId: string
  stripeAccessToken: string
  stripeRefreshToken: string
  stripeWebhookSecret: string
  stripeWebhookEndpointId: string
  stripeConnectedAt: timestamp
}
```

#### Product (Synced from Stripe)
```typescript
{
  id: string
  organizationId: string
  stripeProductId: string (required - Stripe is source)

  // Synced from Stripe
  name: string
  description: string
  isActive: boolean  // Mirrors Stripe's active state (no local override)

  // Local metadata
  syncedAt: timestamp
}
```

> **Note**: Product status mirrors Stripe exactly. No local status field - if it's archived in Stripe, it's archived here.

#### Customer (Synced from Stripe)
```typescript
{
  id: string
  organizationId: string
  stripeCustomerId: string (required - Stripe is source)

  // Synced from Stripe
  name: string
  email: string

  // Local metadata
  syncedAt: timestamp
}
```

#### License Policy (Local Config)
```typescript
{
  id: string
  productId: string

  name: string
  licenseLengthDays: number | null  // null = perpetual (never expires)
  activationLimit: number | null     // null = unlimited activations
}
```

> **Note**: No `type` field. The distinction between test and production licenses is handled by the `isTest` flag on the license itself, which mirrors Stripe's `livemode`.

#### License (Owned by Perpetually)
```typescript
{
  id: string
  organizationId: string
  productId: string
  customerId: string
  licensePolicyId: string | null

  // License key
  key: string (XXXX-XXXX-XXXX-XXXX, unique)
  keyCreatedAt: timestamp

  // Status (simple: active or disabled)
  status: "active" | "disabled"

  // Expiration (computed: expired = now > expiresAt AND status = active)
  expiresAt: timestamp | null  // null = never expires

  // Activation limit
  activationLimit: number | null  // null = unlimited

  // Disable tracking (only set when status = disabled)
  disabledAt: timestamp | null
  disabledReason: "refund" | "chargeback" | "fraud" | "customer_request" | "other" | null
  disabledNotes: string | null  // Free-text context

  // Stripe reference
  stripePaymentIntentId: string

  // Test mode flag (mirrors Stripe's livemode)
  isTest: boolean

  createdAt: timestamp
  updatedAt: timestamp
}
```

> **Key Design Decision**: `expired` is NOT a stored status. It's computed from `expiresAt`. A license with `status: "active"` and `expiresAt < now` is considered expired.

#### Activation (Owned by Perpetually)
```typescript
{
  id: string
  licenseId: string
  organizationId: string

  name: string | null (friendly name)
  machineId: string | null (hardware fingerprint)
  ipAddress: string
  userAgent: string

  lastSeenAt: timestamp
  createdAt: timestamp
}
```

#### License Event (Audit Trail)
```typescript
{
  id: string
  licenseId: string
  organizationId: string

  // Event type
  type: "license.created" | "license.status_changed" | "license.extended" |
        "license.key_regenerated" | "activation.created" | "activation.removed"

  // Actor tracking
  actorType: "user" | "api" | "system" | "customer"
  actorId: string | null  // userId, secretKeyId, or null for system

  // Event data (varies by type)
  data: JSON  // e.g., { from: "active", to: "disabled", reason: "refund" }

  // Metadata
  ipAddress: string | null
  userAgent: string | null

  createdAt: timestamp
}
```

### Removed Entities
- **Release** - Version tracking removed (customers manage this themselves)
- **Account** - OAuth accounts (not needed for current scope)
- **LicensePolicy.type** - No longer needed; test vs prod handled by `isTest` flag

---

## State Machines

### Product State (Mirrored from Stripe)

Products don't have a local state machine - they mirror Stripe exactly.

```
Stripe Product active: true  →  Perpetually isActive: true
Stripe Product active: false →  Perpetually isActive: false (archived)
```

**No local overrides.** If a customer wants to stop selling a product, they archive it in Stripe.

**Impact on licenses:** Archived products have no impact on existing licenses. Licenses continue to work. Only new license creation is prevented.

---

### License State Machine

Licenses have a simple two-state model with computed expiration.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      LICENSE STATE MACHINE                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │    ┌────────────┐                    ┌──────────────┐    │  │
│  │    │   ACTIVE   │◄──────────────────►│   DISABLED   │    │  │
│  │    └─────┬──────┘     enable /       └──────────────┘    │  │
│  │          │            disable                             │  │
│  │          │                                                │  │
│  │          │ (computed)                                     │  │
│  │          ▼                                                │  │
│  │    ┌────────────┐                                         │  │
│  │    │  EXPIRED   │  (when now > expiresAt)                │  │
│  │    │ (virtual)  │                                         │  │
│  │    └────────────┘                                         │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stored States

| State | Description | Reversible |
|-------|-------------|------------|
| `active` | License is valid and can be used | N/A |
| `disabled` | License is blocked | Yes (can be re-enabled) |

### Computed States

| State | Condition | Description |
|-------|-----------|-------------|
| `expired` | `status = active` AND `now > expiresAt` | Time-based expiration |
| `valid` | `status = active` AND `now <= expiresAt` (or no expiry) | License works |

### State Transitions

#### Active → Disabled

**Trigger:** Manual action via dashboard or API

**Required fields when disabling:**
- `disabledAt`: Timestamp of when disabled
- `disabledReason`: One of `refund`, `chargeback`, `fraud`, `customer_request`, `other`
- `disabledNotes`: Optional free-text context

**Use cases:**
- Refund was issued
- Chargeback filed
- Fraud detected
- Customer requested
- Other administrative reasons

#### Disabled → Active

**Trigger:** Manual action via dashboard or API (re-enable)

**What happens:**
- `status` → `active`
- `disabledAt`, `disabledReason`, `disabledNotes` → cleared (set to null)

**Use cases:**
- Mistake was made
- Issue was resolved
- Customer dispute won

#### Extending Expiration

**Trigger:** Manual action via dashboard or API

**What happens:**
- `expiresAt` → new future timestamp
- License event logged: `license.extended`

**Note:** Can extend an expired license (brings it back to valid state)

### Validation Logic

```typescript
function getLicenseValidity(license: License): LicenseValidity {
  // Check stored status first
  if (license.status === 'disabled') {
    return {
      valid: false,
      reason: 'disabled',
      disabledReason: license.disabledReason
    };
  }

  // Check expiration
  if (license.expiresAt && license.expiresAt < new Date()) {
    return {
      valid: false,
      reason: 'expired',
      expiredAt: license.expiresAt
    };
  }

  // Check activation limit
  const activationCount = await getActivationCount(license.id);
  if (license.activationLimit && activationCount >= license.activationLimit) {
    return {
      valid: false,
      reason: 'activation_limit_reached',
      activationCount,
      activationLimit: license.activationLimit
    };
  }

  return {
    valid: true,
    activationCount,
    activationLimit: license.activationLimit,
    expiresAt: license.expiresAt
  };
}
```

### Disable Reasons

| Reason | Description | Typical Action |
|--------|-------------|----------------|
| `refund` | Customer was refunded | Received refund notification, owner disabled |
| `chargeback` | Customer disputed charge | Should disable - money was taken back |
| `fraud` | Fraudulent purchase detected | Permanent disable |
| `customer_request` | Customer asked to disable | May re-enable if requested |
| `other` | Catch-all for edge cases | Use notes field for context |

---

## Audit Trail

### Overview

All significant license events are logged to the `license_events` table for full audit history.

### Event Types

| Event | Trigger | Data Logged |
|-------|---------|-------------|
| `license.created` | Payment webhook | `{ stripePaymentIntentId, productId, customerId }` |
| `license.status_changed` | Enable/disable action | `{ from, to, reason, notes }` |
| `license.extended` | Expiry date changed | `{ previousExpiresAt, newExpiresAt }` |
| `license.key_regenerated` | Key regeneration | `{ previousKeyPrefix }` (first 4 chars only) |
| `activation.created` | Device activated | `{ activationId, machineId, name }` |
| `activation.removed` | Device deactivated | `{ activationId, machineId, name }` |

### Actor Types

| Actor Type | Description | Example |
|------------|-------------|---------|
| `user` | Dashboard user action | Admin disables license |
| `api` | API key action | Backend creates activation |
| `system` | Automated action | Webhook creates license |
| `customer` | Portal action | End-user removes activation |

### What We Don't Log

- **Validation attempts** - Too high volume. Track `lastSeenAt` on activation instead.
- **Failed validations** - Could be useful but adds volume. Consider adding later.

### Retention

- Keep forever (for now)
- Consider time-based retention policy later if volume becomes an issue

### Example Event Records

```json
// License created from Stripe payment
{
  "type": "license.created",
  "actorType": "system",
  "actorId": null,
  "data": {
    "stripePaymentIntentId": "pi_xxx",
    "productId": "prod_xxx",
    "customerId": "cust_xxx",
    "key": "XXXX-****-****-****"
  }
}

// License disabled due to refund
{
  "type": "license.status_changed",
  "actorType": "user",
  "actorId": "user_xxx",
  "data": {
    "from": "active",
    "to": "disabled",
    "reason": "refund",
    "notes": "Customer requested refund, processed via Stripe"
  }
}

// License re-enabled
{
  "type": "license.status_changed",
  "actorType": "user",
  "actorId": "user_xxx",
  "data": {
    "from": "disabled",
    "to": "active",
    "previousReason": "customer_request",
    "notes": "Customer changed their mind"
  }
}

// Activation created
{
  "type": "activation.created",
  "actorType": "api",
  "actorId": "sk_xxx",
  "data": {
    "activationId": "act_xxx",
    "machineId": "hw_fingerprint_xxx",
    "name": "John's MacBook Pro"
  }
}
```

---

## User Flows

### 1. Onboarding Flow

```
Register (email/password)
    │
    ▼
Create Organization (name, slug)
    │
    ▼
Connect Stripe (OAuth Connect)
    │
    ▼
Import Products (from Stripe)
    │
    ▼
Configure License Policies (per product)
    │
    ▼
Dashboard (ready to receive payments)
```

### 2. First Sale Flow (Customer's Perspective)

```
Customer's user visits checkout
    │
    ▼
Pays via Stripe Checkout
    │
    ▼
Payment succeeds
    │
    ▼
Webhook received by Perpetually
    │
    ▼
License created automatically
    │
    ▼
Customer receives license key (via email or portal)
```

### 3. License Validation Flow (End-User's Perspective)

```
End-user installs software
    │
    ▼
Enters license key
    │
    ▼
Software calls POST /api/v1/validate
    │
    ▼
If valid + under activation limit:
    │
    ├─▶ Software calls POST /api/v1/activate
    │       │
    │       ▼
    │   Activation recorded
    │       │
    │       ▼
    │   Software unlocked
    │
    ▼
If invalid/expired/over limit:
    │
    ▼
Show error message
```

### 4. Dashboard Management Flow

```
Org owner logs in
    │
    ├─▶ Dashboard: See stats, recent licenses, expiring soon
    │
    ├─▶ Products: View synced products, configure policies
    │
    ├─▶ Customers: View customers, see their licenses
    │
    ├─▶ Licenses: Search, filter, update status, revoke
    │
    └─▶ Settings: Team, API keys, Stripe connection
```

### 5. Customer Self-Service Flow

```
End-user visits portal (/{orgSlug}/portal/{customerId})
    │
    ▼
Views their licenses
    │
    ├─▶ See activation count vs limit
    │
    ├─▶ Manage activations (remove old devices)
    │
    ├─▶ Regenerate license key (if needed)
    │
    └─▶ View activation history
```

---

## System Flows

### Payment → License Creation

```
Stripe Payment
    │
    ▼
Webhook: payment_intent.succeeded
    │
    ▼
Verify signature (org's webhook secret)
    │
    ▼
Extract: product_id (from metadata or line items)
    │
    ├─▶ Missing product_id? → Skip, log warning
    │
    ▼
Find/sync Product (by stripeProductId)
    │
    ▼
Find/sync Customer (by stripeCustomerId)
    │
    ▼
Find LicensePolicy for product (or use defaults)
    │
    ▼
Check Stripe metadata for overrides:
    - activation_limit
    - license_duration_days
    │
    ▼
Generate license key (XXXX-XXXX-XXXX-XXXX)
    │
    ▼
Create License:
    - status: "active"
    - expiresAt: now + duration
    - isTest: !event.livemode
    │
    ▼
Send notification (license created)
    │
    ▼
Return 200 OK
```

### Product Sync Flow

```
Initial: User clicks "Import from Stripe"
    │
    ▼
Fetch all products from Stripe (stripe.products.list)
    │
    ▼
For each product:
    │
    ├─▶ Already exists (by stripeProductId)? → Update
    │
    └─▶ New? → Create with synced data
    │
    ▼
Mark org as onboarded

Ongoing: Webhook product.created / product.updated
    │
    ▼
Upsert product (by stripeProductId)
```

### Refund Handling

```
Stripe Refund
    │
    ▼
Webhook: charge.refunded
    │
    ▼
Find license by stripePaymentIntentId
    │
    ▼
Send notification to org owner:
    "Refund detected for license XXX. Take action?"
    │
    ▼
Org owner decides (via dashboard):
    - Revoke license
    - Suspend license
    - Do nothing
```

---

## API Design

### Authentication

Two authentication methods:
1. **Web Session** - Cookie-based (Better Auth) for dashboard
2. **API Key** - Bearer token (`sk_live_xxx`) for programmatic access

### Public API Endpoints (v1)

#### POST /api/v1/validate
Validate a license key.

**Request:**
```json
{
  "licenseId": "lic_xxx",
  "key": "XXXX-XXXX-XXXX-XXXX"
}
```

**Response:**
```json
{
  "valid": true,
  "license": {
    "id": "lic_xxx",
    "status": "active",
    "expiresAt": "2025-12-31T00:00:00Z",
    "activationCount": 2,
    "activationLimit": 5
  }
}
```

#### POST /api/v1/activate
Register a device activation.

**Request:**
```json
{
  "licenseId": "lic_xxx",
  "key": "XXXX-XXXX-XXXX-XXXX",
  "machineId": "unique-hardware-id",
  "name": "John's MacBook"
}
```

**Response:**
```json
{
  "success": true,
  "activation": {
    "id": "act_xxx",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/v1/deactivate
Remove a device activation.

**Request:**
```json
{
  "activationId": "act_xxx"
}
```

#### GET /api/v1/licenses
List all licenses (requires API key).

**Query params:** `?productId=xxx&status=active&limit=50`

**Response:**
```json
{
  "licenses": [...],
  "hasMore": true,
  "nextCursor": "xxx"
}
```

#### GET /api/v1/licenses/:id
Get license details (requires API key).

### Removed API Endpoints
- `POST /api/v1/licenses` - No manual license creation (all from Stripe)

---

## Customer Portal

### URL Structure
```
/{orgSlug}/portal/{customerId}
```

### Features (Full Self-Service)

1. **View Licenses**
   - All licenses for this customer
   - Status, expiration, activation count

2. **Manage Activations**
   - See all activated devices
   - Remove activations (free up slots)
   - View last seen timestamp

3. **Regenerate Key**
   - Generate new license key
   - Old key immediately invalidated
   - For active licenses only

4. **View History**
   - Activation history
   - Key regeneration history

### Authentication
- No login required
- URL acts as authentication (customerId is a token)
- Consider: Adding email verification layer later

---

## Features to Build

### Must Have (MVP)

1. **Stripe Webhook Handling**
   - [ ] Add `isTest` flag to licenses based on `livemode`
   - [ ] Handle `product.created/updated` for auto-sync
   - [ ] Handle `charge.refunded` with notifications
   - [ ] Reject payments without product metadata (with logging)

2. **Test Mode Toggle**
   - [ ] Add sidebar toggle for test/live mode
   - [ ] Filter all data by `isTest` flag
   - [ ] Visual indicator when in test mode

3. **Email Notifications**
   - [ ] License created notification
   - [ ] License expiring soon (7 days, 1 day)
   - [ ] License expired
   - [ ] New activation detected
   - [ ] Refund detected (to org owner)

4. **Product Sync**
   - [ ] Auto-sync on `product.created/updated` webhooks
   - [ ] Remove manual product creation
   - [ ] Add `syncedAt` timestamp

5. **Customer Sync**
   - [ ] Auto-create customer on payment
   - [ ] Sync customer details from Stripe
   - [ ] Remove manual customer creation

6. **License Policy via Stripe Metadata**
   - [ ] Read `activation_limit` from payment metadata
   - [ ] Read `license_duration_days` from payment metadata
   - [ ] Metadata overrides Perpetually defaults

7. **Customer Portal Enhancements**
   - [ ] Manage activations (remove devices)
   - [ ] View activation history
   - [ ] Regenerate license key

8. **Audit Trail**
   - [ ] Create `license_events` table
   - [ ] Log `license.created` events on payment
   - [ ] Log `license.status_changed` on enable/disable
   - [ ] Log `license.extended` on expiry changes
   - [ ] Log `license.key_regenerated` on key regeneration
   - [ ] Log `activation.created` and `activation.removed`
   - [ ] Display audit history in license detail view

### Nice to Have (Post-MVP)

1. **Bulk License Import** - CSV/API for migration
2. **Custom License Key Format** - Let orgs define their format
3. **Webhooks (Outbound)** - Notify customer's systems of license events
4. **Team Invites** - Email-based team member invitations
5. **Two-Factor Auth** - For org owners/admins
6. **Audit Trail Retention** - Time-based cleanup for old events

---

## Features to Remove

1. **Manual Product Creation**
   - Remove `createProduct` server function
   - Remove product create UI
   - Products only from Stripe sync

2. **Manual Customer Creation**
   - Remove `createCustomer` server function
   - Remove customer create UI
   - Customers only from Stripe payments

3. **Manual License Creation**
   - Remove `createLicense` server function
   - Remove license create UI
   - Remove `POST /api/v1/licenses` endpoint
   - Licenses only from Stripe payments

4. **Release Table/Feature**
   - Remove `release` table from schema
   - Remove release-related UI and functions
   - Customers manage versions themselves

5. **Subscription Support**
   - Remove subscription-related webhook handling
   - Focus on one-time payments only
   - Simplify license status logic

6. **Old License Status Values**
   - Replace `status: "active" | "expired" | "suspended" | "revoked"` with `status: "active" | "disabled"`
   - `expired` becomes computed from `expiresAt`
   - `suspended` and `revoked` merge into `disabled` with `disabledReason`

7. **License Policy Type Field**
   - Remove `type: "perpetual" | "subscription" | "trial"` from license_policy
   - Policy just defines duration + activation limit
   - Test vs production handled by `isTest` flag on license

8. **Local Product Status**
   - Replace `status: "pending" | "active" | "archived"` with `isActive: boolean`
   - Mirror Stripe's product active state directly

---

## Open Questions

### 1. Historical Sales Import

**Question**: When a customer connects their Stripe account, should we import historical payments and create licenses retroactively?

**Pros of importing:**
- Immediate value for existing businesses
- Complete picture of all licenses
- Customers don't need to re-purchase

**Cons of importing:**
- Complex: Which payments count? Only successful? What about refunds?
- Data quality: Old payments may lack proper metadata
- Confusion: Customers already using another license system

**Recommendation**: Start with fresh-start-only. Add import as premium feature later with clear UX for handling edge cases.

---

### 2. Customer Portal Authentication

**Question**: Is URL-based access (using customerId as token) secure enough?

**Current**: `/{orgSlug}/portal/{customerId}` - anyone with URL can access

**Options:**
a) Keep as-is (simple, similar to Stripe receipts)
b) Add email verification step
c) Add magic link login

**Recommendation**: Keep URL-based for MVP. The customerId is a UUID (hard to guess). Add email verification as enhancement later.

---

### 3. Stripe Metadata Schema

**Question**: What metadata keys should we document for customers to use?

**Proposed schema:**
```
Product metadata:
  perpetually_activation_limit: number
  perpetually_license_duration_days: number

Payment metadata:
  perpetually_product_id: string (maps to stripeProductId)
```

**Recommendation**: Document this clearly. Make product-level metadata work as defaults, payment-level as overrides.

---

## Implementation Phases

### Phase 1: Core Cleanup
1. Add `isTest` flag to license schema
2. Add test mode toggle to UI
3. Remove manual product/customer/license creation
4. Remove Release table

### Phase 2: Stripe Sync
1. Implement product.created/updated webhook
2. Add customer auto-creation from payments
3. Add product `syncedAt` tracking
4. Implement Stripe metadata parsing for license config

### Phase 3: Notifications
1. Set up email infrastructure (Resend/Postmark)
2. Implement license created notification
3. Implement expiring soon notifications
4. Implement refund notifications

### Phase 4: Portal Enhancement
1. Activation management UI
2. Activation history
3. Key regeneration with confirmation

### Phase 5: Polish
1. Improved dashboard analytics
2. Better onboarding UX
3. API documentation improvements
4. Error handling and edge cases

---

## Appendix: Stripe Metadata Example

### Setting Up a Product in Stripe

```javascript
// When creating a product in Stripe
const product = await stripe.products.create({
  name: 'Pro Desktop App',
  metadata: {
    perpetually_activation_limit: '5',
    perpetually_license_duration_days: '365'
  }
});

// When creating a checkout session
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: 'price_xxx',
    quantity: 1
  }],
  payment_intent_data: {
    metadata: {
      // Optional: Override product defaults for this specific sale
      perpetually_activation_limit: '10'  // VIP customer gets more
    }
  }
});
```

### How Perpetually Processes It

```
1. Payment succeeds
2. Webhook received
3. Extract product from line items
4. Look up product metadata: activation_limit=5, duration=365
5. Check payment metadata: activation_limit=10 (override!)
6. Create license with activation_limit=10, expires in 365 days
```

---

*This document is the source of truth for the Perpetually product direction. Update it as decisions are made.*
