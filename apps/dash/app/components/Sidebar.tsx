import { Navbar } from "~/components/sidebar/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from "~/components/sidebar/sidebar";
import { SidebarLayout } from "~/components/sidebar/sidebar-layout";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/16/solid";
import {
  Cog6ToothIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  Square2StackIcon,
  TicketIcon,
} from "@heroicons/react/20/solid";
import { ReactNode } from "react";
import { useLocation } from "react-router";

export function AppSideBar({
  children,
  name,
  email,
  teamName,
  isOnboarded,
}: {
  name: string;
  email: string;
  teamName: string;
  isOnboarded: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <SidebarLayout
      navbar={<Navbar></Navbar>}
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="lg:mb-2.5">
              <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-base/6 font-bold text-zinc-950 sm:py-2 sm:text-lg/5">
                {teamName}
              </div>
            </div>
            <SidebarSection className="max-lg:hidden"></SidebarSection>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarItem
                current={currentPath === "/"}
                href="/"
                disabled={!isOnboarded}
              >
                <HomeIcon />
                <SidebarLabel>Home</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                current={currentPath.includes("/products")}
                href="/products"
                disabled={!isOnboarded}
              >
                <Square2StackIcon />
                <SidebarLabel>Products</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                current={currentPath.includes("/licenses")}
                href="/licenses"
                disabled={!isOnboarded}
              >
                <TicketIcon />
                <SidebarLabel>Licenses</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                current={currentPath.includes("/settings")}
                href="/settings"
                disabled={!isOnboarded}
              >
                <Cog6ToothIcon />
                <SidebarLabel>Settings</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
            <SidebarSection className="max-lg:hidden">
              {/* <SidebarHeading>Upcoming Events</SidebarHeading> */}
              {/* <SidebarItem href="/events/1"> */}
              {/*   Bear Hug: Live in Concert */}
              {/* </SidebarItem> */}
              {/* <SidebarItem href="/events/2">Viking People</SidebarItem> */}
              {/* <SidebarItem href="/events/3">Six Fingers — DJ Set</SidebarItem> */}
              {/* <SidebarItem href="/events/4">We All Look The Same</SidebarItem> */}
            </SidebarSection>
            <SidebarSpacer />
            <SidebarSection>
              <SidebarItem current={currentPath === "/support"} href="/support">
                <QuestionMarkCircleIcon />
                <SidebarLabel>Docs</SidebarLabel>
              </SidebarItem>
              <SidebarItem current={currentPath === "/support"} href="/support">
                <QuestionMarkCircleIcon />
                <SidebarLabel>Support</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
          <SidebarFooter>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                  {name}
                </div>
                <div className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                  {email}
                </div>
              </div>
              <form method="POST" action="/logout">
                <button type="submit">
                  <ArrowRightStartOnRectangleIcon className="w-6 h-6 flex-shrink-0" />
                </button>
              </form>
            </div>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
