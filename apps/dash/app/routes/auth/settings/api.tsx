import { Separator } from "~/components/ui/separator";
import {
  Form,
  useLoaderData,
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import { db } from "@perpetually/db/config";
import { teamSchema } from "@perpetually/db/schema";
import { requireUserId } from "~/auth.server";
import { eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { redirectWithSuccess } from "remix-toast";
import { refreshApiKey } from "@perpetually/db/models";
import { Icons } from "~/components/icons";
import { Button } from "~/components/ui/button";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { teamId } = await requireUserId(request);

  await refreshApiKey({ teamId });

  return redirectWithSuccess("/settings/API", "API key refreshed!");
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { teamId } = await requireUserId(request);

  const team = await db.query.teamSchema.findFirst({
    where: eq(teamSchema.id, teamId),
    columns: { apiKey: true },
  });

  invariant(team, "no team found in TeamSettings");

  return { team };
}

export default function TeamSettings() {
  const { team } = useLoaderData<typeof loader>();

  return (
    <div className="">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">API</h3>
        <Separator />
      </div>

      <Form
        method="post"
        className="pt-6 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2"
      >
        <div className="sm:col-span-5">
          <label
            htmlFor="key"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            API key
          </label>
          <div className="mt-2 flex rounded-md shadow-sm">
            <div className="relative flex flex-grow items-stretch focus-within:z-10">
              <input
                value={team.apiKey}
                disabled
                id="key"
                className="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="John Smith"
              />
            </div>
            <button
              type="button"
              className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={() => {
                navigator.clipboard.writeText(team.apiKey);
              }}
            >
              <Icons.Copy
                className="-ml-0.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              Copy
            </button>
          </div>
        </div>
        <div className="sm:col-span-5 mt-6 flex items-center justify-end gap-x-6">
          <Button variant="outline" type="submit">
            Refresh API key
          </Button>
        </div>
      </Form>
    </div>
  );
}
