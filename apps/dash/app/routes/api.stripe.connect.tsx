import type { ActionFunction } from "react-router";

export const action: ActionFunction = async () => {
  const connectParams = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: "read_write",
    redirect_uri: `${process.env.BASE_URL}/stripe/connect`,
  });

  return {
    url: `https://connect.stripe.com/oauth/authorize?${connectParams}`,
  };
};
