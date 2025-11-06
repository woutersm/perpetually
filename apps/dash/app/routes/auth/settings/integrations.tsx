import { Separator } from "~/components/ui/separator";
import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireUserId } from "~/auth.server";
import { Form } from "react-router";
import { Text } from "~/components/Text";
import { Button } from "~/components/ui/button";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { teamId } = await requireUserId(request);

  return {};
};

export default function Integrations() {
  return (
    <div className="">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Integrations</h3>
        <Separator />
      </div>

      <Form
        method="post"
        className="pt-6 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2"
      >
        <div className="sm:col-span-5">
          <Text>You are connected with your Stripe account.</Text>
        </div>

        {/* <div className="sm:col-span-5 mt-6 flex items-center justify-end gap-x-6">
          <Button variant="outline" type="submit">
            Manage subscription
          </Button>
        </div> */}
      </Form>
    </div>
  );
}
