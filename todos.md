# Configuration Checklist

## 1. Resend (Email)

Resend is used for transactional emails (license created, refund detected, etc.). Optional - emails are skipped if not configured.

- [ ] Create account at [resend.com](https://resend.com)
- [ ] Verify your domain (or use their test domain for dev)
- [ ] Create API key at [resend.com/api-keys](https://resend.com/api-keys)
- [ ] Set `RESEND_API_KEY=re_xxx`

## 2. Stripe - Perpetually Billing (YOUR subscriptions)

This is your Stripe account for charging Perpetually subscription fees to your customers.

- [ ] Create Stripe account at [stripe.com](https://stripe.com)
- [ ] Get secret key from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
- [ ] Set `STRIPE_SECRET_KEY=sk_test_xxx`
- [ ] Create "Pro" product with $29/month price
- [ ] Create "Business" product with $99/month price
- [ ] Copy price IDs → `STRIPE_PRICE_PRO` and `STRIPE_PRICE_BUSINESS`
- [ ] Create webhook endpoint → `{APP_URL}/api/billing/webhook`
- [ ] Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
- [ ] Copy webhook secret → `STRIPE_BILLING_WEBHOOK_SECRET`

## 3. Stripe Connect (Customer payment processing)

This allows YOUR customers to connect their own Stripe accounts to sell software licenses.

- [ ] Enable Connect at [dashboard.stripe.com/settings/connect](https://dashboard.stripe.com/settings/connect)
- [ ] Set platform type (likely "Platform or marketplace")
- [ ] Copy Client ID → `STRIPE_CLIENT_ID=ca_xxx`
- [ ] Set OAuth redirect URI → `{APP_URL}/api/stripe/callback`

## 4. Production Deployment

- [ ] Set `APP_URL` to your production domain
- [ ] Set `BETTER_AUTH_URL` to your production domain
- [ ] Generate new `BETTER_AUTH_SECRET` for production
- [ ] Switch Stripe keys from test to live mode
- [ ] Update webhook endpoints to production URLs
