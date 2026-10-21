import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTestMode } from "@/lib/test-mode-context";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "Licenses", url: "/licenses" },
  { title: "Customers", url: "/customers" },
  { title: "Products", url: "/products" },
];

const PLAYGROUND = { title: "API Playground", url: "/playground" };

export const SETTINGS_TABS = [
  { title: "General", url: "/settings" },
  { title: "Team", url: "/settings/team" },
  { title: "API keys", url: "/settings/api" },
  { title: "Branding", url: "/settings/branding" },
  { title: "Billing", url: "/settings/billing" },
];

export const CONTENT_WIDTH = "mx-auto w-full max-w-[1100px] px-4 sm:px-6";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
      <span className="size-2 rounded-full bg-vibrant" aria-hidden />
      perpetually
    </span>
  );
}

function NavLink({
  url,
  active,
  children,
  className,
}: {
  url: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={url}
      className={cn(
        "-mb-px flex h-14 shrink-0 items-center whitespace-nowrap border-b px-3 text-sm transition-colors",
        className,
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export function TopNav({
  email,
  organizationName,
  isSandbox,
}: {
  email: string;
  organizationName?: string;
  isSandbox: boolean;
}) {
  const { pathname } = useLocation();
  const router = useRouter();
  const { isTestMode, toggleTestMode } = useTestMode();
  const items = isSandbox ? [...NAV, PLAYGROUND] : NAV;

  const signOut = () =>
    authClient.signOut({ fetchOptions: { onSuccess: () => router.navigate({ to: "/login" }) } });

  const settingsActive = pathname.startsWith("/settings");

  return (
    <header className="border-b border-border bg-background">
      <div className={cn(CONTENT_WIDTH, "flex h-14 items-center gap-4 lg:gap-6")}>
        <Link to="/dashboard" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden flex-1 items-center lg:flex">
          {items.map((item) => (
            <NavLink key={item.url} url={item.url} active={pathname.startsWith(item.url)}>
              {item.title}
            </NavLink>
          ))}
        </nav>

        <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground lg:ml-0">
          <Switch checked={isTestMode} onCheckedChange={toggleTestMode} className="data-[state=checked]:bg-warning" />
          <span className="hidden sm:inline">Test data</span>
          <span className="sm:hidden">Test</span>
        </label>

        <NavLink url="/settings" active={settingsActive} className="hidden lg:flex">
          Settings
        </NavLink>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <span className="max-w-[9rem] truncate sm:max-w-[14rem]">{organizationName ?? "Account"}</span>
            <ChevronDown className="size-3.5 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-xs text-muted-foreground">Signed in as</span>
              <span className="block truncate text-sm">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Below lg the links move to their own row, scrolling sideways when they don't fit */}
      <nav className="overflow-x-auto border-t border-border [scrollbar-width:none] lg:hidden">
        <div className={cn(CONTENT_WIDTH, "flex w-max min-w-full")}>
          {[...items, { title: "Settings", url: "/settings" }].map((item, i) => (
            <NavLink
              key={item.url}
              url={item.url}
              active={pathname.startsWith(item.url)}
              className={cn("h-11", i === 0 && "-ml-3")}
            >
              {item.title}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function SettingsTabs() {
  const { pathname } = useLocation();
  return (
    <div className="-mt-4 mb-8 overflow-x-auto [scrollbar-width:none] sm:mb-10">
      <div className="flex w-max min-w-full gap-6 border-b border-border">
        {SETTINGS_TABS.map((tab) => {
          const active = tab.url === "/settings" ? pathname === "/settings" : pathname.startsWith(tab.url);
          return (
            <Link
              key={tab.url}
              to={tab.url}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b pb-3 text-sm transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
