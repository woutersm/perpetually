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
import { redirectWithSuccess } from "remix-toast";
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

export const schema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { teamId } = await requireUserId(request);
  const team = await getTeam({ teamId });

  if (team?.stripeApiKey) {
    return redirectWithSuccess("/onboarding/2", "API key already set up!");
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

  await db
    .update(teamSchema)
    .set({ stripeApiKey: submission.value.apiKey })
    .where(eq(teamSchema.id, teamId))
    .execute();

  return redirectWithSuccess("/onboarding/2", "API key set up successfully!");
}

export default function OnboardingStep1() {
  const lastResult = useActionData<typeof action>();
  const { team } = useLoaderData<typeof loader>();

  const [form, { apiKey }] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  return (
    <Page title="Onboarding - Step 1">
      <div className="space-y-4">
        <Text>Create a restricted API key to sync products from Stripe.</Text>
        <Text>
          1. Go to Developers → API Keys in your Stripe Dashboard.
          <br />
          2. Click Create restricted key.
          <br />
          3. Set permissions for Products to Read.
          <br />
          4. Copy the API key and submit below
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
            htmlFor={apiKey.id}
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Restricted API Key
          </label>
          <div className="mt-2">
            <Textarea
              {...getInputProps(apiKey, { type: "text" })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <ValidationError errors={apiKey.errors} />
        </div>
        <div className="sm:col-span-5 mt-6 flex items-center justify-end gap-x-6">
          <Button type="submit">Continue</Button>
        </div>
      </Form>
    </Page>
  );
}
