import { LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, useActionData, useLoaderData, useNavigate } from "react-router";
import { Page } from "~/components/Page";
import { ValidationError } from "~/components/Error";
import { redirectWithSuccess } from "remix-toast";
import { createLicenseAction } from "@perpetually/db/models";
import { getUser, getUserId } from "~/auth.server";
import invariant from "tiny-invariant";
import { db } from "@perpetually/db/config";
import { eq } from "drizzle-orm";
import { productSchema } from "@perpetually/db/schema";
import { useState } from "react";

export const schema = z.object({
  name: z.string(),
  stripeProductId: z.string(),
  email: z.string().email(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const user = await getUser(request);

  invariant(user, "no user in createLicense");

  const { name, email, stripeProductId } = submission.value;

  await createLicenseAction({
    teamId: user?.teamId,
    stripeProductId,
    name,
    email,
  });

  return redirectWithSuccess(`/licenses`, {
    message: `License created`,
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { teamId } = await getUserId(request);

  const products = await db.query.productSchema.findMany({
    where: eq(productSchema.teamId, teamId),
  });

  return { products };
}

export default function CreateLicense() {
  const { products } = useLoaderData<typeof loader>();
  const [productId, setProductId] = useState(products[0].id);
  const lastResult = useActionData<typeof action>();
  const [form, { name, email }] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  const navigate = useNavigate();

  return (
    <Page title="New license">
      <Form id={form.id} onSubmit={form.onSubmit} method="post">
        <div className="space-y-12">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Product
              </h2>
            </div>
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
              <div className="sm:col-span-4">
                <label
                  htmlFor="product"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Name
                </label>
                <div>
                  <select
                    required
                    defaultValue={products[0].name}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 mt-2"
                    onChange={(e) => {
                      const selectedProduct = products.find(
                        (p: typeof productSchema.$inferSelect) => p.name === e.target.value
                      );
                      setProductId(selectedProduct?.stripeProductId ?? "");
                    }}
                  >
                    {products.map((p: typeof productSchema.$inferSelect) => (
                      <option key={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    name="productId"
                    readOnly
                    hidden
                    value={productId}
                  ></input>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Customer
              </h2>
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
              <div className="sm:col-span-4">
                <label
                  htmlFor={name.id}
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Name
                </label>
                <div className="mt-2">
                  <input
                    {...getInputProps(name, { type: "text" })}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
                <ValidationError errors={name.errors} />
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor={email.id}
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Email
                </label>
                <div className="mt-2">
                  <input
                    {...getInputProps(email, { type: "email" })}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
                <ValidationError errors={email.errors} />
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
        </div>
      </Form>
    </Page>
  );
}
