create extra customers and products in stripe for sandbox - lets go

- [ ] email provider (resend?)

- [ ] figure out the states and transitions for a product -> draw it
- [ ] figure out the states and transitions for a license -> draw it
      state for license ->
      new without activation limit -> active
      new with activation limit -> inactive
      todo: on first activation and remove on no remaining activations
      with activations -> active
- [ ] when deactivating a lincsen and reactivatingng based it should go to unactive

## License

    Questions:
    - is using realeses voluntary?
        restrict can only work with releases, or no releases is never restrict?

- [ ] tests for Perpetual licenses and release?
      test restrict
      test revoke

# TODOS

- [ ] check customer portal
  - [ ] think about OTP for it
- [ ] delete release (with confirmation)
- [ ] handle no licenses on /licenses

- [ ] cron job to expire licenses after expiry date in concourse

- [ ] create env config class to parse env and fail with error (curently using invariant but that doens't show the actual problem in NODE_ENV=production). This for example for SESSION_SECRET=lalalala: Like reader/app/environment.server.ts

# SMALL

- [ ] only be able to generete a new key when the old one is valid

Competitors:
https://docs.lemonsqueezy.com/help/licensing
https://anystack.sh/docs/getting-started/product-configuration#start
https://keygen.sh/docs/getting-started/

NTH:

- [ ] use slug of product and scope by team id, scope licenses by team id when searching on product
- [ ] activity timeline on license

HOW IT STARTED:

    https://twitter.com/daniel_nguyenx/status/1747486640241881527

    - license key generation, activation, deactivation
    - license renewal/upgrade
    - user portal for all those operations
    - integration with a payment provider (can be LemonSqueezy, Paddle or Stripe)
    - MUST support Perpetual Fallback License: determine if user can receive updates & supports, and what’s the latest software version they can access

https://x.com/codyschneiderxx/status/1819790369166430275

https://docs.polar.sh/features/benefits/license-keys#automate-customer-license-key-management

https://stronglytyped.uk/articles/building-license-key-activation-system-nextjs-supabase-stripe

link

            <div className="text-sm font-semibold leading-6 text-gray-900">
              Stripe Product ID
            </div>
            <Text>{product.stripeProductId}</Text>


            to stripe product

Starting production server
/prod/dash/node_modules/.pnpm/express@4.19.2/node_modules/express/lib/application.js:217
throw new TypeError('app.use() requires a middleware function')
^

TypeError: app.use() requires a middleware function
at Function.use (/prod/dash/node_modules/.pnpm/express@4.19.2/node_modules/express/lib/application.js:217:11)
at file:///prod/dash/server.js:42:7

source for license creation:

      - stripe
      - manual
      - api
