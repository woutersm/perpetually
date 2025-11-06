import {
  Outlet,
  useLoaderData,
  useNavigate,
  LoaderFunctionArgs,
} from "react-router";
import { eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { Icons } from "~/components/icons";
import { db } from "@perpetually/db/config";
import { customerSchema, licenseSchema, teamSchema } from "@perpetually/db/schema";

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug, customerId } = params;
  invariant(customerId, "no userId in u.$userid");

  const team = await db.query.teamSchema.findFirst({
    where: eq(teamSchema.slug, slug ?? ""),
  });
  invariant(team, "no team found for portal");

  const customer = await db.query.customerSchema.findFirst({
    where: eq(customerSchema.id, customerId),
    with: {
      licenses: {
        where: eq(licenseSchema.teamId, team.id),
        with: {
          product: {
            with: { team: { columns: { name: true } } },
          },
        },
      },
    },
  });

  invariant(customer, "no customer found for portal");

  return { customer };
}

export default function UserPortal() {
  const { customer } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
      <aside className="relative h-screen overflow-hidden md:w-1/3 bg-gray-50">
        <div className="text-black p-20">
          <div className="mt-10 text-2xl">Manage your license</div>
          <div className="flex items-center mt-8">
            <Icons.BackArrow />

            <button onClick={() => navigate(-1)}>
              <div className="ml-2">
                Return to {customer.licenses[0].product.team.name}
              </div>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
