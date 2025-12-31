# Stripe Connect OAuth Implementation

This document describes the Stripe Connect OAuth integration for the licensing platform.

## Overview

The platform uses Stripe Connect OAuth to securely connect to customers' existing Stripe accounts. This allows:

- One-click "Connect with Stripe" onboarding
- Automatic webhook endpoint creation
- Secure token-based access (revocable by customer)
- No manual API key sharing required

## Architecture

```
Customer clicks "Connect" → Stripe OAuth → Access Token returned
                                        → Webhook endpoint auto-created
                                        → Credentials stored in DB
```

### Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Your App  │     │   Stripe    │     │  Customer   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ 1. Click "Connect with Stripe"        │
       │◄──────────────────────────────────────│
       │                   │                   │
       │ 2. Redirect to Stripe OAuth           │
       │──────────────────►│                   │
       │                   │                   │
       │                   │ 3. Customer logs in & authorizes
       │                   │◄──────────────────│
       │                   │                   │
       │ 4. Redirect with auth code            │
       │◄──────────────────│                   │
       │                   │                   │
       │ 5. Exchange code for token            │
       │──────────────────►│                   │
       │                   │                   │
       │ 6. Access token + account ID          │
       │◄──────────────────│                   │
       │                   │                   │
       │ 7. Create webhook endpoint            │
       │──────────────────►│                   │
       │                   │                   │
       │ 8. Webhook secret returned            │
       │◄──────────────────│                   │
       │                   │                   │
       │ 9. Store credentials, redirect to import
       │                   │                   │
```

## Database Schema

### Organization Table Fields

```typescript
// src/lib/db/schema.ts

export const organization = sqliteTable("organization", {
  // ... other fields ...

  // Stripe Connect OAuth
  stripeConnectId: text("stripe_connect_id"),           // acct_xxx (connected account ID)
  stripeAccessToken: text("stripe_access_token"),       // OAuth access token
  stripeRefreshToken: text("stripe_refresh_token"),     // For token refresh
  stripeScope: text("stripe_scope"),                    // "read_write"
  stripeTokenType: text("stripe_token_type"),           // "bearer"
  stripeConnectedAt: integer("stripe_connected_at", { mode: "timestamp_ms" }),
  stripeWebhookSecret: text("stripe_webhook_secret"),   // whsec_xxx
  stripeWebhookEndpointId: text("stripe_webhook_endpoint_id"), // we_xxx
});
```

## Environment Variables

```bash
# .env
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxx           # From Stripe Dashboard → Connect settings
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx     # Your platform's API key
APP_URL=http://localhost:3000              # Your app URL (use tunnel URL for webhooks)
```

## API Routes

### OAuth Initiation

**GET** `/api/stripe/connect?organizationId=xxx`

Redirects to Stripe OAuth authorization page.

**File:** `src/routes/api/stripe/connect.ts`

**Query Parameters:**
- `organizationId` (required): The organization to connect

**Response:** 302 redirect to `https://connect.stripe.com/oauth/authorize`

### OAuth Callback

**GET** `/api/stripe/callback?code=xxx&state=organizationId`

Handles OAuth callback, exchanges code for token, creates webhook.

**File:** `src/routes/api/stripe/callback.ts`

**Query Parameters:**
- `code`: Authorization code from Stripe
- `state`: Organization ID (passed through OAuth flow)
- `error`: Error code if authorization failed
- `error_description`: Error message

**Actions:**
1. Exchange authorization code for access token
2. Create webhook endpoint on connected account
3. Store credentials in database
4. Redirect to `/onboarding/import`

**Error Handling:** Redirects to `/onboarding/1?error=<message>` on failure

## Server Functions

### `getOnboardingStatus`

**File:** `src/functions/onboarding.ts`

Returns the current onboarding state.

```typescript
{
  isStripeConnected: boolean;  // Has valid OAuth connection
  hasWebhookSecret: boolean;   // Webhook is configured
  isOnboarded: boolean;        // Completed onboarding
  organizationId: string;
  stripeConnectId: string | null;
}
```

### `importProductsFromStripe`

**File:** `src/functions/onboarding.ts`

Imports products from the connected Stripe account using the OAuth access token.

### `completeOnboarding`

**File:** `src/functions/onboarding.ts`

Marks onboarding as complete (skipping import).

### `disconnectStripe`

**File:** `src/functions/onboarding.ts`

Disconnects Stripe account:
1. Deletes webhook endpoint via Stripe API
2. Clears all Stripe fields in database
3. Resets `isOnboarded` to false

## Onboarding Flow

### Steps

1. **Connect** (`/onboarding/1`) - "Connect with Stripe" button
2. **Import** (`/onboarding/import`) - Import products or skip

### Route Guards

- `/onboarding/` - Redirects to appropriate step based on status
- `/onboarding/1` - Redirects to import if already connected
- `/onboarding/import` - Redirects to step 1 if not connected

## Webhook Handler

**File:** `src/routes/api/hooks/$organizationId.ts`

Uses `stripeAccessToken` to interact with connected account's Stripe API.

**Events Handled:**
- `checkout.session.completed`
- `payment_intent.succeeded`
- `invoice.payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Settings Page

**File:** `src/routes/_auth/settings/index.tsx`

Displays Stripe connection status with:
- Connected account ID
- Connection date
- Disconnect button

## Stripe Dashboard Setup

### 1. Enable Connect

Go to **Stripe Dashboard → Connect → Settings**

### 2. Get Client ID

In **Connect Settings → Integration**:
- Copy **Client ID** (starts with `ca_`)

### 3. Configure OAuth Redirect URIs

In **Connect Settings → Integration → OAuth**:

```
http://localhost:3000/api/stripe/callback     (development)
https://your-domain.com/api/stripe/callback   (production)
```

### 4. Platform Profile (Optional)

In **Connect Settings → Branding**:
- Add platform name and icon for OAuth screen

## Local Development

### Tunnel Required for Webhooks

OAuth redirects work with localhost, but webhooks require a public URL.

**Using ngrok:**
```bash
ngrok http 3000
```

**Using Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:3000
```

Update `.env` with tunnel URL:
```bash
APP_URL=https://xxxx.ngrok-free.app
```

Add tunnel URL to Stripe OAuth redirect URIs.

## File Summary

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Database schema with Stripe OAuth fields |
| `src/routes/api/stripe/connect.ts` | OAuth initiation endpoint |
| `src/routes/api/stripe/callback.ts` | OAuth callback handler |
| `src/routes/api/hooks/$organizationId.ts` | Webhook handler |
| `src/functions/onboarding.ts` | Onboarding server functions |
| `src/functions/settings.ts` | Settings queries |
| `src/functions/sessions.ts` | Session with org context |
| `src/routes/_auth/onboarding/index.tsx` | Onboarding router |
| `src/routes/_auth/onboarding/1.tsx` | Connect step UI |
| `src/routes/_auth/onboarding/import.tsx` | Import step UI |
| `src/routes/_auth/settings/index.tsx` | Settings with Stripe section |

## Security Considerations

1. **Token Storage**: Access tokens stored in database (consider encryption at rest)
2. **Revocation**: Customers can revoke access from their Stripe dashboard
3. **Scope**: Using `read_write` scope for webhook creation
4. **Webhook Verification**: All webhooks verified using stored secret

## Token Refresh (Future Enhancement)

The `stripeRefreshToken` is stored but not currently used. Stripe Connect tokens don't expire, but if needed:

```typescript
const response = await stripe.oauth.token({
  grant_type: "refresh_token",
  refresh_token: org.stripeRefreshToken,
});
```
