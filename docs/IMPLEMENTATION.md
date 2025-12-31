# Implementation Tracker

> Progress tracking for implementing the [Product Blueprint](./PRODUCT_BLUEPRINT.md)

**Started**: December 2024
**Status**: Phase 3 Complete

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

## Phase 4: License State Machine

### 4.1 Update License Status Logic

- [ ] Create `disableLicense` function with required reason
- [ ] Create `enableLicense` function (clears disabled fields)
- [ ] Remove `revokeLicense` function (replaced by `disableLicense`)
- [ ] Update `updateLicense` to handle new status model

**Files to modify:**
- `src/functions/licenses.ts`

### 4.2 Update Validation Logic

- [ ] Update `POST /api/v1/validate` to use computed expiration
- [ ] Return appropriate error for `disabled` status with reason
- [ ] Return appropriate error for expired licenses

**Files to modify:**
- `src/lib/api/` (validation endpoint)

### 4.3 Update Dashboard UI

- [ ] Update license detail page with new status display
- [ ] Add disable/enable actions with reason selection
- [ ] Show `disabledReason` and `disabledNotes` when disabled
- [ ] Update license list filtering for new statuses

**Files to modify:**
- `src/routes/_auth/licenses/` (UI components)

---

## Phase 5: Audit Trail

### 5.1 Create Event Logging Utility

- [ ] Create `logLicenseEvent` helper function
- [ ] Accept: licenseId, type, actorType, actorId, data, request (for IP/UA)
- [ ] Insert into `license_event` table

**Files to create:**
- `src/lib/audit.ts`

### 5.2 Integrate Event Logging

- [ ] Log `license.created` in webhook handler
- [ ] Log `license.status_changed` in enable/disable functions
- [ ] Log `license.extended` when `expiresAt` changes
- [ ] Log `license.key_regenerated` in key regeneration function
- [ ] Log `activation.created` in activation function
- [ ] Log `activation.removed` in deactivation function

**Files to modify:**
- `src/routes/api/hooks/$organizationId.ts`
- `src/functions/licenses.ts`
- `src/routes/_auth/portal/` (portal functions)

### 5.3 Display Audit History

- [ ] Create `getLicenseEvents` server function
- [ ] Add "History" tab/section to license detail page
- [ ] Display events in chronological order
- [ ] Show actor, type, data, timestamp

**Files to modify:**
- `src/functions/licenses.ts`
- `src/routes/_auth/licenses/$licenseId.tsx` (or similar)

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

## Phase 7: Email Notifications

### 7.1 Set Up Email Infrastructure

- [ ] Choose provider (Resend recommended)
- [ ] Add API key to environment
- [ ] Create email sending utility

**Files to create:**
- `src/lib/email.ts`

### 7.2 Implement Notification Types

- [ ] License created notification (to customer)
- [ ] License expiring soon (7 days, 1 day before)
- [ ] License expired notification
- [ ] Refund detected notification (to org owner)
- [ ] New activation notification (optional, to customer)

**Files to create:**
- `src/lib/email/templates/`

### 7.3 Add Scheduled Jobs (for expiring soon)

- [ ] Set up cron job or scheduled task
- [ ] Query licenses expiring in 7 days (not yet notified)
- [ ] Query licenses expiring in 1 day (not yet notified)
- [ ] Send notifications and mark as notified

**Files to create:**
- `src/jobs/` or use Trigger.dev

---

## Phase 8: Customer Portal Enhancements

### 8.1 Activation Management

- [ ] List all activations for each license
- [ ] Add "Remove" button for each activation
- [ ] Confirm before removing
- [ ] Log `activation.removed` event

**Files to modify:**
- `src/routes/$orgSlug/portal/$customerId.tsx`
- `src/functions/portal.ts`

### 8.2 View Audit History

- [ ] Show relevant events to customer (activations, key regeneration)
- [ ] Filter out internal events (status changes by admins)

**Files to modify:**
- `src/routes/$orgSlug/portal/$customerId.tsx`

### 8.3 Key Regeneration

- [ ] Add "Regenerate Key" button
- [ ] Confirm with warning that old key will stop working
- [ ] Generate new key, invalidate old
- [ ] Log `license.key_regenerated` event

**Files to modify:**
- `src/functions/portal.ts`
- `src/routes/$orgSlug/portal/$customerId.tsx`

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

---

*Update this document as implementation progresses.*
