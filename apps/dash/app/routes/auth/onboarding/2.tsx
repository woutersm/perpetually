import { Page } from "~/components/Page";
import {
  ActionFunctionArgs,
  Form,
  LoaderFunctionArgs,
  useActionData,
  useLoaderData,
} from "react-router";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { getInputProps, useForm } from "@conform-to/react";
import { redirectWithSuccess, redirectWithError } from "remix-toast";
import { ValidationError } from "~/components/Error";
import { requireUserId } from "~/auth.server";
import { db } from "@perpetually/db/config";
import { teamSchema } from "@perpetually/db/schema";
import { eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { Text } from "~/components/Text";
import { Textarea } from "~/components/ui/textarea";
import { getTeam } from "@perpetually/db/models";
import { Button } from "~/components/ui/button";
import Stripe from "stripe";

export const schema = z.object({
  webhookSecret: z.string().min(1, "Webhook secret is required"),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { teamId } = await requireUserId(request);
  const team = await getTeam({ teamId });

  if (!team?.stripeApiKey) {
    return redirectWithSuccess(
      "/onboarding/1",
      "Please set up your API key first!"
    );
  }

  if (team?.stripeWebhookSecret) {
    return redirectWithSuccess("/", "Onboarding completed!");
  }

  return { team };
}

export async function action({ request }: ActionFunctionArgs) {
  const { teamId } = await requireUserId(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const team = await getTeam({ teamId });
  invariant(team, "Team not found");
  invariant(team.stripeApiKey, "Stripe API key not found");

  try {
    const stripe = new Stripe(team.stripeApiKey);

    const baseUrl = "https://perpetually.dev";

    // List all webhook endpoints
    const endpoints = await stripe.webhookEndpoints.list();

    // Find the endpoint that matches our URL
    const constructedUrl = `${baseUrl}/hooks/${teamId}`;
    const endpoint = endpoints.data.find((endpoint) => {
      console.debug({
        endpoint,
        endpointUrl: endpoint.url,
        constructedUrl,
        message:
          "Comparing endpoint.url with constructedUrl in onboarding step 2",
      });

      return endpoint.url === constructedUrl;
    });

    //validate the format of the webhook secret
    const webhookSecretRegex = /^whsec_[a-zA-Z0-9]{32}$/;

    if (!webhookSecretRegex.test(submission.value.webhookSecret)) {
      return redirectWithError(
        "/onboarding/2",
        "Invalid webhook secret format. Please check the secret from your Stripe Dashboard."
      );
    }

    if (!endpoint) {
      return redirectWithError(
        "/onboarding/2",
        "No webhook endpoint found. Please create a webhook endpoint in your Stripe Dashboard first."
      );
    }

    if (!endpoint.enabled_events.includes("payment_intent.succeeded")) {
      return redirectWithError(
        "/onboarding/2",
        "The webhook endpoint must have 'payment_intent.succeeded' event enabled. Please update your webhook endpoint in the Stripe Dashboard."
      );
    }

    // If we get here, the webhook secret is valid
    await db
      .update(teamSchema)
      .set({
        stripeWebhookSecret: submission.value.webhookSecret,
      })
      .where(eq(teamSchema.id, teamId))
      .execute();

    return redirectWithSuccess(
      "/onboarding/import",
      "Webhook secret validated successfully!"
    );
  } catch (error) {
    console.error("Webhook validation error:", error);
    return redirectWithError(
      "/onboarding/2",
      "Failed to validate webhook. Please try again."
    );
  }
}

export default function OnboardingStep2() {
  const lastResult = useActionData<typeof action>();
  const { team } = useLoaderData<typeof loader>();

  const [form, { webhookSecret }] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  const baseUrl = "https://perpetually.dev";

  return (
    <Page title="Onboarding - Step 2">
      <div className="space-y-4">
        <Text>Create a webhook in your Stripe Dashboard</Text>
        <Text>
          1. Go to Webhooks → Add endpoint
          <br />
          2. Enter your URL:{" "}
          <span className="font-bold">
            {baseUrl}/hooks/{team?.id}
          </span>
          <br />
          3. Select events: payment_intent.succeeded
          <br />
          4. Click "Add endpoint"
          <br />
          5. Copy the webhook secret and submit below
        </Text>
      </div>

      <Form
        id={form.id}
        onSubmit={form.onSubmit}
        method="post"
        className="pt-6 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2"
      >
        <div className="sm:col-span-5">
          <label
            htmlFor={webhookSecret.id}
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Webhook Secret
          </label>
          <div className="mt-2">
            <Textarea
              {...getInputProps(webhookSecret, { type: "text" })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <ValidationError errors={webhookSecret.errors} />
        </div>
        <div className="sm:col-span-5 mt-6 flex items-center justify-end gap-x-6">
          <Button type="submit">Continue</Button>
        </div>
      </Form>
    </Page>
  );
}
