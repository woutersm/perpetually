# Implementation Tracker

> Progress tracking for implementing the [Product Blueprint](./PRODUCT_BLUEPRINT.md)

**Started**: December 2024
**Status**: Phase 8 Complete

---

## Overview

This document tracks the implementation progress of refactoring Perpetually from its current state to the blueprint vision. The key changes are:

1. **Stripe as source of truth** for products and customers
2. **Simplified license states** (`active` | `disabled` with computed `expired`)
3. **Audit trail** for all license events
4. **Remove manual creation** of products, customers, and licenses
5. **Test mode** via Stripe test mode (not manual trials)

---

## Phase 1: Schema Changes

### 1.1 License Table Updates ✓

- [x] Update status enum to only allow `active` | `disabled`
- Note: Other fields (isTest, disabledAt, disabledReason, etc.) deferred to later phases

**Files to modify:**
- `src/lib/db/schema.ts`
- Migration file (generate with `bun run db:generate`)

### 1.2 Product Table Updates ✓

- [x] Add `isActive` boolean field (default: true)
- [x] Remove `status` enum field from product (replace with `isActive`)
- Note: slug kept for internal routing; syncedAt deferred

**Files to modify:**
- `src/lib/db/schema.ts`
- Migration file

### 1.3 License Policy Table Updates

- Note: Deferred - type field kept for now

### 1.4 New License Events Table ✓

- [x] Create `license_event` table with all audit trail fields
- [x] Add relations to schema

### 1.5 Remove Release Table ✓

- [x] Drop `release` table
- [x] Remove release relations from schema
- [x] Remove release-related functions

---

## Phase 2: Remove Manual Creation ✓

### 2.1 Remove Manual Product Creation ✓

- [x] Remove `createProduct` server function
- [x] Remove `deleteProduct` server function
- [x] Remove product creation UI/form
- [x] Update products page to be read-only (synced from Stripe)
- [x] Keep `updateProduct` for description only

### 2.2 Remove Manual Customer Creation ✓

- [x] Remove `createCustomer` server function
- [x] Remove `updateCustomer` server function
- [x] Remove `deleteCustomer` server function
- [x] Remove customer creation/edit UI
- [x] Update customers page to be read-only (synced from Stripe)

### 2.3 Remove Manual License Creation ✓

- [x] Remove `createLicense` server function
- [x] Remove license creation UI/form
- [x] Remove `POST /api/v1/licenses` API endpoint
- [x] Remove related API tests
- [x] Update empty states to explain Stripe sync

---

## Phase 3: Stripe Sync ✓

### 3.1 Product Sync from Webhooks ✓

- [x] Handle `product.created` webhook → create local product
- [x] Handle `product.updated` webhook → update local product
- [x] Handle `product.deleted` webhook → set `isActive: false`
- [x] `importProductsFromStripe` already uses new schema

### 3.2 Customer Sync from Payments ✓

- [x] Find customer by `stripeCustomerId` first, then by email
- [x] Fetch customer details from Stripe API if creating new
- [x] Store `stripeCustomerId` on customer
- [x] Update `syncedAt` timestamp

### 3.3 License Creation from Payments ✓

- [x] Extract `isTest` from `event.livemode` (invert: `isTest = !livemode`)
- [x] Store `stripePaymentIntentId` on license
- [x] Read metadata for license config overrides:
  - `perpetually_activation_limit`
  - `perpetually_license_duration_days`
- [x] Use license policy defaults if no overrides
- [x] Log `license.created` event to audit trail

### 3.4 Refund Notifications ✓

- [x] Handle `charge.refunded` webhook
- [x] Find license by `stripePaymentIntentId`
- [x] Log refund event to audit trail (does NOT auto-disable)
- Note: Email notification deferred to Phase 7

---

## Phase 4: License State Machine ✓

### 4.1 Update License Status Logic ✓

- [x] Create `disableLicense` function with required reason
- [x] Create `enableLicense` function (clears disabled fields)
- [x] Remove `revokeLicense` function (replaced by `disableLicense`) - N/A, didn't exist
- [x] Update `updateLicense` to handle new status model (status removed, use enable/disable)

**Files modified:**
- `src/functions/licenses.ts`

### 4.2 Update Validation Logic ✓

- [x] Update `POST /api/v1/validate` to use computed expiration
- [x] Return appropriate error for `disabled` status with reason (`disabledReason` field)
- [x] Return appropriate error for expired licenses

**Files modified:**
- `src/lib/api/app.ts`
- `src/lib/api/schemas.ts`

### 4.3 Update Dashboard UI ✓

- [x] Update license detail page with new status display
- [x] Add disable/enable actions with reason selection
- [x] Show `disabledReason` and `disabledNotes` when disabled
- [x] Update license list filtering for new statuses

**Files modified:**
- `src/routes/_auth/licenses/$licenseId.tsx`
- `src/routes/_auth/licenses/index.tsx` (already correct)

---

## Phase 5: Audit Trail ✓

### 5.1 Create Event Logging Utility ✓

- [x] Create `logLicenseEvent` helper function
- [x] Accept: licenseId, type, actorType, actorId, data, request (for IP/UA)
- [x] Insert into `license_event` table

**Files created:**
- `src/lib/audit.ts`

### 5.2 Integrate Event Logging ✓

- [x] Log `license.created` in webhook handler (already done in Phase 3)
- [x] Log `license.status_changed` in enable/disable functions
- [x] Log `license.extended` when `expiresAt` changes
- [ ] Log `license.key_regenerated` in key regeneration function (deferred - no regen function yet)
- [x] Log `activation.created` in activation function
- [x] Log `activation.removed` in deactivation function

**Files modified:**
- `src/functions/licenses.ts`

### 5.3 Display Audit History ✓

- [x] Create `getLicenseEvents` server function
- [x] Add "History" section to license detail page
- [x] Display events in chronological order
- [x] Show actor, type, data, timestamp

**Files modified:**
- `src/functions/licenses.ts`
- `src/routes/_auth/licenses/$licenseId.tsx`

---

## Phase 6: Test Mode Toggle

### 6.1 Add Test Mode State

- [ ] Add `isTestMode` to organization or session context
- [ ] Store preference in localStorage or session
- [ ] Default to live mode

**Files to modify:**
- `src/lib/auth.ts` or new context file

### 6.2 Add UI Toggle

- [ ] Add toggle switch to sidebar
- [ ] Visual indicator when in test mode (banner, color change)
- [ ] Persist preference across sessions

**Files to modify:**
- `src/components/sidebar.tsx` (or layout component)

### 6.3 Filter Data by Test Mode

- [ ] Update all license queries to filter by `isTest`
- [ ] Update dashboard stats to separate test/live
- [ ] Update customer queries (show customers with test licenses in test mode)

**Files to modify:**
- `src/functions/licenses.ts`
- `src/functions/dashboard.ts`
- `src/functions/customers.ts`

---

## Phase 7: Email Notifications ✓

### 7.1 Set Up Email Infrastructure ✓

- [x] Choose provider (Resend)
- [x] Add API key to environment
- [x] Create email sending utility

**Files created:**
- `src/lib/email.ts` - Resend client wrapper
- `src/lib/email/notifications.ts` - Email sending functions
- `src/lib/email/templates.ts` - HTML email templates

### 7.2 Implement Notification Types ✓

- [x] License created notification (to customer)
- [x] License expiring soon (7 days, 1 day before)
- [x] License expired notification
- [x] Refund detected notification (to org owner)

### 7.3 Add Scheduled Jobs (for expiring soon) ✓

- [x] Set up Trigger.dev for scheduled tasks
- [x] Query licenses expiring in 7 days (not yet notified)
- [x] Query licenses expiring in 1 day (not yet notified)
- [x] Send notifications and mark as notified
- [x] Add notification tracking fields to license table

**Files created:**
- `trigger.config.ts` - Trigger.dev configuration
- `src/trigger/license-expiry-notifications.ts` - Daily scheduled task

---

## Phase 8: Customer Portal Enhancements ✓

### 8.1 Activation Management ✓

- [x] List all activations for each license
- [x] Add "Remove" button for each activation
- [x] Confirm before removing (AlertDialog)
- [x] Log `activation.removed` event

### 8.2 View Audit History ✓

- [x] Show relevant events to customer (activations, key regeneration)
- [x] Filter out internal events (status changes by admins)
- [x] Add expandable history with "Show more/less" toggle
- [x] Add relative time formatting ("just now", "2 hours ago")

### 8.3 Key Regeneration ✓

- [x] Add "Regenerate Key" button
- [x] Confirm with warning that old key will stop working
- [x] Generate new key, invalidate old
- [x] Log `license.key_regenerated` event

**Files modified:**
- `src/routes/portal/$slug/$customerId.tsx` - Added ActivationsList, EventHistory components
- `src/functions/portal.ts` - Added removeActivation, updated getPortalCustomer
- `src/lib/utils.ts` - Added formatRelativeTime utility

---

## Migration Checklist

Before deploying, ensure:

- [ ] All schema migrations are tested
- [ ] Existing data is migrated correctly
- [ ] API responses match new schema
- [ ] UI handles both old and new states during transition
- [ ] Webhook handlers are updated before going live
- [ ] Email templates are tested
- [ ] Test mode toggle works correctly

---

## Notes

### Breaking Changes

1. **License status enum** - Old: `active|expired|suspended|revoked` → New: `active|disabled`
2. **Product status** - Old: `pending|active|archived` → New: `isActive` boolean
3. **API response format** - May need versioning if external consumers exist

### Dependencies to Add

- [ ] Email provider SDK (e.g., `resend`)
- [ ] Potentially a job scheduler if not using Trigger.dev

### Questions to Resolve During Implementation

1. How to handle existing licenses with `suspended` or `revoked` status?
2. Should we keep old API endpoints working during transition?
3. How to notify existing customers about test mode change?

---

## Progress Log

| Date | Phase | Items Completed | Notes |
|------|-------|-----------------|-------|
| Dec 2024 | Phase 1 | Schema changes, license_event table, release table removed | License status simplified to active/disabled |
| Dec 2024 | Phase 2 | All manual creation removed | Products, customers, licenses now Stripe-only |
| Dec 2024 | Phase 3 | Stripe sync webhook handlers | Product/customer/license sync from Stripe events |
| Dec 2024 | Phase 4 | License state machine with enable/disable | disabledReason in API, UI for reason selection |
| Dec 2024 | Phase 5 | Audit trail system | logLicenseEvent utility, event logging, History UI |

---

*Update this document as implementation progresses.*
