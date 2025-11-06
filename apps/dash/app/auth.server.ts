import { createCookieSessionStorage, redirect } from "react-router";
import invariant from "tiny-invariant";
import { db } from "@perpetually/db/config";
import { userSchema } from "@perpetually/db/schema";
import { eq } from "drizzle-orm";

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

const USER_SESSION_KEY = "me";

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request) {
  try {
    const session = await getSession(request);
    const userSessionKey = session.get(USER_SESSION_KEY);

    if (!userSessionKey) {
      return { userId: null, teamId: null };
    }

    const { userId, teamId } = userSessionKey;

    return { userId, teamId };
  } catch (error) {
    // If there's an error reading the session, treat it as no session
    console.error("Error reading session:", error);
    return { userId: null, teamId: null };
  }
}

export async function getUser(request: Request) {
  const { userId } = await getUserId(request);
  if (userId === undefined) return null;

  const user = await db.query.userSchema.findFirst({
    where: eq(userSchema.id, userId),
  });

  return user;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);

  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return userId;
}

export async function requireUser(request: Request) {
  const { userId } = await requireUserId(request);

  const user = await db.query.userSchema.findFirst({
    where: eq(userSchema.id, userId),
  });
  if (user) return user;

  throw await logout(request);
}

export async function createUserSession({
  request,
  userId,
  teamId,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: string;
  teamId: string;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  session.set(USER_SESSION_KEY, { userId, teamId });

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined,
      }),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
