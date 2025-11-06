import { type ActionFunctionArgs, redirect, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, useActionData, useLoaderData, useNavigate } from "react-router";

import invariant from "tiny-invariant";
import { Page } from "~/components/Page";
import { db } from "@perpetually/db/config";
import { eq } from "drizzle-orm";
import { productSchema, releaseSchema, userSchema } from "@perpetually/db/schema";
import { requireUser } from "~/auth.server";

export const schema = z.object({
  tag: z.string(),
  description: z.string().optional(),
});

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { releaseId, productId } = params;
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });
  invariant(releaseId, "no releaseId in editRelease");
  invariant(productId, "no releaseId in editRelease");

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { tag, description } = submission.value;

  await db
    .update(releaseSchema)
    .set({ tag, description })
    .where(eq(releaseSchema.id, releaseId));

  return redirect(`/products/${productId}`);
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { releaseId, productId } = params;
  invariant(releaseId, "no releaseId in product detail page");
  invariant(productId, "no releaseId in product detail page");
  const user = await requireUser(request);

  // TODO: why base this query of user?
  const release = await db.query.userSchema.findFirst({
    where: eq(userSchema.id, user.id),
    with: {
      team: {
        with: {
          products: {
            where: eq(productSchema.id, productId),
            with: { releases: { where: eq(releaseSchema.id, releaseId) } },
          },
        },
      },
    },
  });

  invariant(release, "no release in release detail page");

  return { release: release.team.products[0].releases[0] };
}

export default function EditRelease() {
  const { release } = useLoaderData<typeof loader>();
  const lastResult = useActionData<typeof action>();
  const [form, { tag, description }] = useForm({
    lastResult,

    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  const navigate = useNavigate();

  return (
    <Page title="Edit release">
      <Form id={form.id} onSubmit={form.onSubmit} method="post">
        <div className="space-y-12">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Release
              </h2>
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
              <div className="sm:col-span-4">
                <label
                  htmlFor={tag.id}
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Tag
                </label>
                <div className="mt-2">
                  <input
                    {...getInputProps(tag, { type: "text" })}
                    defaultValue={release.tag}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div className="col-span-full">
                <label
                  htmlFor={description.id}
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Description
                </label>
                <div className="mt-2">
                  <textarea
                    {...getInputProps(description, { type: "text" })}
                    defaultValue={release.description ?? ""}
                    rows={2}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  A short description to help identify the release.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <button
            type="button"
            className="text-sm font-semibold leading-6 text-gray-900"
            onClick={() => {
              navigate(-1);
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Save
          </button>
        </div>
      </Form>
    </Page>
  );
}
