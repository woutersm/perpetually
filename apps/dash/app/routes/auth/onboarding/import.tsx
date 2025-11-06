import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData, useActionData } from "react-router";
import { eq } from "drizzle-orm";
import { requireUser } from "~/auth.server";
import { db } from "@perpetually/db/config";
import { teamSchema } from "@perpetually/db/schema";
import { Page } from "~/components/Page";
import { Button } from "~/components/ui/button";
import { getTeam } from "@perpetually/db/models";
import Stripe from "stripe";
import {
  createProductFromStripe,
  createProductsFromStripe,
} from "@perpetually/db/models";
import {
  jsonWithSuccess,
  redirectWithSuccess,
  redirectWithError,
} from "remix-toast";
import invariant from "tiny-invariant";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { getInputProps, useForm } from "@conform-to/react";
import { ValidationError } from "~/components/Error";
import { Textarea } from "~/components/ui/textarea";

const schema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

type ActionData = {
  error?: Record<string, string[] | null>;
  currentKey?: string;
  success?: boolean;
  status?: "success" | "error";
  fields?: string[];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const team = await getTeam({ teamId: user.teamId });

  invariant(team, "no team found");

  return { team };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const team = await getTeam({ teamId: user.teamId });

  invariant(team, "no team found");

  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "updateApiKey") {
    const submission = parseWithZod(formData, { schema });

    if (submission.status !== "success") {
      return submission.reply();
    }

    await db
      .update(teamSchema)
      .set({ stripeApiKey: submission.value.apiKey })
      .where(eq(teamSchema.id, user.teamId))
      .execute();

    return jsonWithSuccess(
      { success: true, status: "success" },
      "API key updated successfully!"
    );
  }

  try {
    await createProductsFromStripe(team);

    await db
      .update(teamSchema)
      .set({ isOnboarded: 1 })
      .where(eq(teamSchema.id, user.teamId))
      .execute();

    return redirectWithSuccess("/products", "Products imported successfully!");
  } catch (error) {
    await db
      .update(teamSchema)
      .set({ stripeApiKey: null })
      .where(eq(teamSchema.id, user.teamId))
      .execute();

    if (error instanceof Error && error.message.includes("Invalid API Key")) {
      return redirectWithError(
        "/onboarding/1",
        "Invalid API Key. Please set a valid Stripe API key."
      );
    }
    throw error;
  }
}

export default function ImportProducts() {
  const { team } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionData | undefined;

  const [form, { apiKey }] = useForm({
    lastResult: actionData,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  if (actionData?.error?.apiKey) {
    return (
      <Page title="Invalid API Key">
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Invalid API Key
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              The provided API key is invalid. Please update it below.
            </p>
          </div>

          <Form id={form.id} onSubmit={form.onSubmit} method="post">
            <input name="intent" value="updateApiKey" readOnly hidden />
            <div className="sm:col-span-5">
              <label
                htmlFor={apiKey.id}
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Stripe API Key
              </label>
              <div className="mt-2">
                <Textarea
                  {...getInputProps(apiKey, { type: "text" })}
                  defaultValue={actionData.currentKey || ""}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
              <ValidationError errors={apiKey.errors} />
            </div>
            <div className="mt-6 flex items-center justify-end gap-x-6">
              <Button type="submit" variant="default">
                Update API Key
              </Button>
            </div>
          </Form>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Import Products">
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900">
            Import Products from Stripe
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Import your active products from Stripe to start managing licenses.
          </p>
        </div>

        <Form method="post">
          <div className="mt-6 flex items-center justify-end gap-x-6">
            <Button type="submit" variant="default">
              Import Products
            </Button>
          </div>
        </Form>
      </div>
    </Page>
  );
}
