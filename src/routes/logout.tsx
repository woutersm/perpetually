import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/lib/auth";
import { getRequestHeaders } from "@tanstack/react-start/server";

const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const headers = getRequestHeaders();
  await auth.api.signOut({ headers });
  return { success: true };
});

export const Route = createFileRoute("/logout")({
  preload: false,
  loader: async () => {
    await logoutFn();
    throw redirect({ to: "/login" });
  },
});
