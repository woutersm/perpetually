import { LoaderFunctionArgs, redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, useActionData } from "react-router";
import { db } from "@perpetually/db/config";
import { eq } from "drizzle-orm";
import { userSchema } from "@perpetually/db/schema";
import bcrypt from "bcryptjs";
import { createUserSession, getUser } from "~/auth.server";
import { ValidationError } from "~/components/Error";

import { Button } from "~/components/auth/Button";
import { Link } from "~/components/auth/Link";
import { GradientBackground } from "~/components/auth/Gradient";
import { Field, Input, Label } from "@headlessui/react";
import { clsx } from "clsx";
import { Icons } from "~/components/icons";

export const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { email, password } = submission.value;

  const user = await db.query.userSchema.findFirst({
    where: eq(userSchema.email, email),
  });

  if (!user) {
    return submission.reply({ formErrors: ["Invalid username or password"] });
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);

  if (!isValid) {
    return submission.reply({ formErrors: ["Invalid username or password"] });
  }

  return createUserSession({
    request,
    userId: user.id,
    teamId: user.teamId,
    remember: true,
    redirectTo: "/",
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);

  if (user?.id) {
    return redirect("/");
  }

  return {};
}

export default function Login() {
  const lastResult = useActionData<typeof action>();
  const [form, { email, password }] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
  });

  return (
    <main className="overflow-hidden bg-gray-50">
      <GradientBackground />
      <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5">
          <Form
            id={form.id}
            onSubmit={form.onSubmit}
            action="#"
            method="POST"
            className="p-7 sm:p-11"
          >
            <div className="flex items-start">
              <Link to={`${import.meta.env.VITE_LANDING_DOMAIN}`} title="Home">
                <Icons.Logo className="h-9 fill-black" />
              </Link>
            </div>
            <h1 className="mt-8 text-base/6 font-medium">Welcome back!</h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              Sign in to your account to continue.
            </p>
            <Field className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium">Email</Label>
              <Input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                {...getInputProps(email, { type: "email" })}
                className={clsx(
                  "block w-full rounded-lg border border-transparent shadow ring-1 ring-black/10",
                  "px-[calc(theme(spacing.2)-1px)] py-[calc(theme(spacing[1.5])-1px)] text-base/6 sm:text-sm/6",
                  "data-[focus]:outline data-[focus]:outline-2 data-[focus]:-outline-offset-1 data-[focus]:outline-black",
                )}
              />
              <ValidationError errors={email.errors} />
            </Field>

            <Field className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium">Password</Label>
              <Input
                {...getInputProps(password, { type: "password" })}
                className={clsx(
                  "block w-full rounded-lg border border-transparent shadow ring-1 ring-black/10",
                  "px-[calc(theme(spacing.2)-1px)] py-[calc(theme(spacing[1.5])-1px)] text-base/6 sm:text-sm/6",
                  "data-[focus]:outline data-[focus]:outline-2 data-[focus]:-outline-offset-1 data-[focus]:outline-black",
                )}
              />
              <ValidationError errors={password.errors} />
            </Field>
            <div className="mt-8">
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </div>
          </Form>
          <div className="m-1.5 rounded-lg bg-gray-50 py-4 text-center text-sm/5 ring-1 ring-black/5">
            Not a member?{" "}
            <Link to="/register" className="font-medium hover:text-gray-600">
              Create an account
            </Link>
          </div>
        </div>
        <ValidationError errors={form.errors} />
      </div>
    </main>
  );
}
