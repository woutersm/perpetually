import { LoaderFunctionArgs, redirect } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { requireUser } from "~/auth.server";
import { AppSideBar } from "~/components/Sidebar";
import { db } from "@perpetually/db/config";
import { teamSchema } from "@perpetually/db/schema";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const team = await db.query.teamSchema.findFirst({
    where: eq(teamSchema.id, user.teamId),
  });

  invariant(team, "no team");

  const url = new URL(request.url);
  const pathname = url.pathname;

  if (team.isOnboarded === 0) {
    if (!team.stripeApiKey && pathname !== "/onboarding/1") {
      return redirect("/onboarding/1");
    }
    if (
      team.stripeApiKey &&
      !team.stripeWebhookSecret &&
      pathname !== "/onboarding/2"
    ) {
      return redirect("/onboarding/2");
    }
    if (
      team.stripeApiKey &&
      team.stripeWebhookSecret &&
      !team.isOnboarded &&
      pathname !== "/onboarding/import"
    ) {
      return redirect("/onboarding/import");
    }
  }

  return {
    name: user.name,
    email: user.email,
    teamName: team?.name,
    isOnboarded: team?.isOnboarded,
  };
}

export default function Auth() {
  const { name, email, teamName, isOnboarded } = useLoaderData<typeof loader>();

  return (
    <div className="bg-background">
      <AppSideBar
        email={email}
        name={name}
        teamName={teamName}
        isOnboarded={isOnboarded === 1}
      >
        <Outlet />
      </AppSideBar>
    </div>
  );
}
