import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function getStripeConnect(code: string) {
  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });

  return response;
}
