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

export const CONTENT_WIDTH = "mx-auto w-full max-w-[1100px] px-6";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
      <span className="size-2 rounded-full bg-vibrant" aria-hidden />
      perpetually
    </span>
  );
}

function NavLink({ url, active, children }: { url: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={url}
      className={cn(
        "-mb-px flex h-14 items-center border-b px-3 text-sm transition-colors",
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

  return (
    <header className="border-b border-border bg-background">
      <div className={cn(CONTENT_WIDTH, "flex h-14 items-center gap-6")}>
        <Link to="/dashboard">
          <Wordmark />
        </Link>

        <nav className="flex flex-1 items-center">
          {items.map((item) => (
            <NavLink key={item.url} url={item.url} active={pathname.startsWith(item.url)}>
              {item.title}
            </NavLink>
          ))}
        </nav>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={isTestMode} onCheckedChange={toggleTestMode} className="data-[state=checked]:bg-warning" />
          Test data
        </label>

        <NavLink url="/settings" active={pathname.startsWith("/settings")}>
          Settings
        </NavLink>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {organizationName ?? "Account"}
            <ChevronDown className="size-3.5" />
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
    </header>
  );
}

export function SettingsTabs() {
  const { pathname } = useLocation();
  return (
    <div className="border-b border-border">
      <div className={cn(CONTENT_WIDTH, "flex gap-1")}>
        {SETTINGS_TABS.map((tab) => {
          const active = tab.url === "/settings" ? pathname === "/settings" : pathname.startsWith(tab.url);
          return (
            <Link
              key={tab.url}
              to={tab.url}
              className={cn(
                "-mb-px border-b px-3 py-3 text-sm transition-colors",
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
