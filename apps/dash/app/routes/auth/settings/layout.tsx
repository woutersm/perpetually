import { Outlet } from "react-router";
import { Page } from "~/components/Page";
import { SidebarNav } from "~/components/sidebar-nav";

export default function Settings() {
  const sidebarNavItems = [
    {
      title: "Profile",
      to: "/settings",
    },
    {
      title: "Integrations",
      to: "/settings/integrations",
    },
    {
      title: "Team",
      to: "/settings/team",
    },
    {
      title: "API",
      to: "/settings/api",
    },
    {
      title: "Subscription",
      to: "/settings/subscription",
    },
  ];

  return (
    <Page title="Settings">
      <div className="space-y-6 p-10 pb-16">
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </Page>
  );
}
