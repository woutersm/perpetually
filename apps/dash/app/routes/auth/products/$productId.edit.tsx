import {
  type ActionFunctionArgs,
  redirect,
  LoaderFunctionArgs,
} from "react-router";
import { z } from "zod";
import { getFieldsetProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, useActionData, useLoaderData, useNavigate } from "react-router";

import { requireUser } from "~/auth.server";
import invariant from "tiny-invariant";
import { Page } from "~/components/Page";
import { zfd } from "zod-form-data";
import { db } from "@perpetually/db/config";
import { and, desc, eq } from "drizzle-orm";
import {
  productSchema,
  releaseSchema,
  licensePolicySchema,
} from "@perpetually/db/schema";
import { ValidationError } from "~/components/Error";
import { createLicensePolicy } from "@perpetually/db/models";

export const schema = z.object({
  activationLimit: zfd.numeric(z.number().min(0).max(5).optional()),
  licenseLength: zfd.numeric(z.number().min(0).max(365).optional()),
  type: z.string(),
});

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { productId } = params;
  invariant(productId, "no productId in editProduct");

  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { type, activationLimit, licenseLength } = submission.value;

  await createLicensePolicy({
    productId,
    type,
    activationLimit,
    licenseLength,
  });

  return redirect(`/products/${productId}`);
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { productId } = params;
  invariant(productId, "no productId in product detail page");
  const user = await requireUser(request);

  const product = await db.query.productSchema.findFirst({
    where: and(
      eq(productSchema.teamId, user?.teamId),
      eq(productSchema.id, productId)
    ),
    with: {
      licenses: { columns: { id: true } },
      releases: { orderBy: desc(releaseSchema.createdAt) },
      licensePolicies: true,
    },
  });

  invariant(product, "no product in product detail page");

  return { product };
}

export default function EditProduct() {
  const { product } = useLoaderData<typeof loader>();
  const lastResult = useActionData<typeof action>();
  const [form, { type, activationLimit, licenseLength }] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  const navigate = useNavigate();
  const licensePolicy = product.licensePolicies?.[0];

  return (
    <Page title="Edit product">
      <Form id={form.id} onSubmit={form.onSubmit} method="post">
        <div className="space-y-12">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Product
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                This information is imported from Stripe.
              </p>
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Name
                </label>
                <div className="mt-2">
                  <input
                    disabled
                    type="text"
                    value={product.name}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-gray-100"
                  />
                </div>
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Description
                </label>
                <div className="mt-2">
                  <textarea
                    disabled
                    value={product.description ?? ""}
                    rows={2}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-gray-100"
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  A short description to help identify the product.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3 mt-10">
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              License policy
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              The default settings for your licenses.
            </p>
          </div>

          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
            <fieldset className="sm:col-span-full" {...getFieldsetProps(type)}>
              <legend className="text-sm font-semibold leading-6 text-gray-900">
                Type
              </legend>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Decide what happens when a license expires.
              </p>
              <div className="mt-6 space-y-6 ml-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-x-3">
                    <input
                      id="restrict"
                      name="type"
                      type="radio"
                      value="RESTRICT"
                      defaultChecked={licensePolicy?.type === "RESTRICT"}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <label
                      htmlFor="restrict"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Restrict
                    </label>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Restrict access to the latest release while the licenses was
                    not yet expired.
                  </p>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-x-3">
                    <input
                      id="revoke"
                      name="type"
                      type="radio"
                      value="REVOKE"
                      defaultChecked={licensePolicy?.type === "REVOKE"}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <label
                      htmlFor="revoke"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Revoke
                    </label>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Revoke all access after the license has expired.
                  </p>
                </div>
                <ValidationError errors={type.errors} />
              </div>
            </fieldset>

            <div className="sm:col-span-full sm:col-start-1">
              <label
                htmlFor={licenseLength.id}
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                License length (in days)
              </label>
              <div className="flex mt-2">
                <div>
                  <input
                    {...getInputProps(licenseLength, { type: "number" })}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    defaultValue={licensePolicy?.licenseLength ?? undefined}
                  />
                </div>
              </div>
              <ValidationError errors={licenseLength.errors} />
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Restrict access to the latest release while the licenses was not
                yet expired.
              </p>
            </div>

            <div className="sm:col-span-full sm:col-start-1">
              <label
                htmlFor={activationLimit.id}
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Activation limit
              </label>
              <div className="flex mt-2">
                <div>
                  <input
                    {...getInputProps(activationLimit, { type: "number" })}
                    defaultValue={licensePolicy?.activationLimit ?? undefined}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <ValidationError errors={activationLimit.errors} />
              <p className="mt-1 text-sm leading-6 text-gray-600">
                The maximum number of licenses active at the same time.
              </p>
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
