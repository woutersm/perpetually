import { redirect } from "react-router";
import { Form } from "react-router";
import { Separator } from "~/components/ui/separator";
import { Text } from "~/components/Text";
import type { ActionFunction, LoaderFunction } from "react-router";
import { Button } from "~/components/ui/button";
import { Icons } from "~/components/icons";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return {};
  }

  return redirect("/dashboard");
};

export const action: ActionFunction = async () => {
  const connectParams = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: "read_write",
    redirect_uri: `${process.env.BASE_URL}/stripe/connect`,
  });

  return redirect(
    `https://connect.stripe.com/oauth/authorize?${connectParams}`
  );
};

export default function StripeConnect() {
  return (
    <div className="">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Subscription</h3>
        <Separator />
      </div>

      <Form
        method="post"
        className="pt-6 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2"
      >
        <div className="sm:col-span-5">
          <Text>
            You are currently on the <b>Free</b> plan.
          </Text>
        </div>

        <div className="sm:col-span-5 mt-6 flex items-center justify-end gap-x-6">
          <Button variant="outline" type="submit">
            Manage subscription
          </Button>
        </div>
      </Form>
    </div>
  );
}
