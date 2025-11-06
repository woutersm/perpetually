import { Separator } from "~/components/ui/separator";
import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { db } from "@perpetually/db/config";
import { userSchema } from "@perpetually/db/schema";
import { requireUserId } from "~/auth.server";
import { eq } from "drizzle-orm";
import { Form, useActionData, useLoaderData } from "react-router";
import invariant from "tiny-invariant";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { getInputProps, useForm } from "@conform-to/react";
import { redirectWithSuccess } from "remix-toast";
import { ValidationError } from "~/components/Error";
import { Button } from "~/components/ui/button";

export const schema = z.object({
  name: z.string(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const { userId } = await requireUserId(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  await db
    .update(userSchema)
    .set({ name: submission.value.name })
    .where(eq(userSchema.id, userId))
    .execute();

  return redirectWithSuccess("/settings", `Profile updated!`);
};
export async function loader({ request }: LoaderFunctionArgs) {
  const { userId } = await requireUserId(request);

  const user = await db.query.userSchema.findFirst({
    where: eq(userSchema.id, userId),
    columns: { email: true, name: true },
  });

  invariant(user, "no user found in ProfileSettings");

  return { user };
}

export default function ProfileSettings() {
  const { user } = useLoaderData<typeof loader>();
  const lastResult = useActionData<typeof action>();

  const [form, { name }] = useForm({
    lastResult,
    defaultValue: {
      name: user.name,
    },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  return (
    <div className="">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Profile</h3>
        <Separator />
      </div>

      <Form
        id={form.id}
        onSubmit={form.onSubmit}
        method="post"
        className="pt-6 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2"
      >
        <div className="sm:col-span-5">
          <label
            htmlFor={name.id}
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Name
          </label>
          <div className="mt-2">
            <input
              {...getInputProps(name, { type: "text" })}
              defaultValue={user.name}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <ValidationError errors={name.errors} />
        </div>
        <div className="sm:col-span-5">
          <label
            htmlFor="email"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Email
          </label>
          <div className="mt-2">
            <input
              disabled
              id="email"
              defaultValue={user.email}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
        <div className="sm:col-span-5 mt-6 flex items-center justify-end gap-x-6">
          <Button variant="outline" type="submit">
            Save
          </Button>
        </div>
      </Form>
    </div>
  );
}
