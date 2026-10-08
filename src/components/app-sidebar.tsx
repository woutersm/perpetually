import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Package,
  Key,
  Users,
  Settings,
  UsersRound,
  KeyRound,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
  FlaskConical,
  CreditCard,
  Palette,
  Terminal,
} from "lucide-react";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Switch } from "@/components/ui/switch";
import { useTestMode } from "@/lib/test-mode-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
];

const managementItems = [
  {
    title: "Products",
    url: "/products",
    icon: Package,
    description: "Your software products",
  },
  {
    title: "Licenses",
    url: "/licenses",
    icon: Key,
    description: "License keys issued",
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
    description: "Your customers",
  },
];

const settingsItems = [
  {
    title: "General",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Billing",
    url: "/settings/billing",
    icon: CreditCard,
  },
  {
    title: "Team",
    url: "/settings/team",
    icon: UsersRound,
  },
  {
    title: "Branding",
    url: "/settings/branding",
    icon: Palette,
  },
  {
    title: "API Keys",
    url: "/settings/api",
    icon: KeyRound,
  },
];

const playgroundItem = {
  title: "API Playground",
  url: "/playground",
  icon: Terminal,
};

export function AppSidebar({
  isSandbox = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & { isSandbox?: boolean }) {
  const overviewItems = isSandbox ? [...navItems, playgroundItem] : navItems;
  const location = useLocation();
  const { isTestMode, toggleTestMode } = useTestMode();

  const isActive = (url: string) => {
    if (url === "/settings") {
      return location.pathname === "/settings";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar {...props}>
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-lg transition-all ${
            isTestMode
              ? "bg-gradient-to-br from-warning to-warning/80 shadow-warning/25"
              : "bg-gradient-vibrant shadow-vibrant/25"
          }`}>
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Perpetually</span>
            <span className="text-[10px] text-muted-foreground">License Management</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Test Mode Toggle */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <button
          onClick={toggleTestMode}
          className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-all ${
            isTestMode
              ? "bg-warning/10 border border-warning/30"
              : "bg-muted/50 border border-transparent hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              isTestMode ? "bg-warning/20" : "bg-muted"
            }`}>
              <FlaskConical className={`h-3.5 w-3.5 ${isTestMode ? "text-warning" : "text-muted-foreground"}`} />
            </div>
            <div className="text-left">
              <span className={`text-xs font-medium ${isTestMode ? "text-warning" : "text-foreground"}`}>
                {isTestMode ? "Test Mode" : "Live Mode"}
              </span>
            </div>
          </div>
          <Switch
            checked={isTestMode}
            onCheckedChange={toggleTestMode}
            className="data-[state=checked]:bg-warning"
          />
        </button>
      </div>

      <SidebarContent className="overflow-hidden">
        {/* Overview */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="group rounded-xl transition-all"
                  >
                    <Link to={item.url}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isActive(item.url) ? 'bg-vibrant/10' : 'bg-transparent group-hover:bg-muted'}`}>
                        <item.icon className={`h-4 w-4 transition-colors ${isActive(item.url) ? 'text-vibrant' : ''}`} />
                      </div>
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* License Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="group rounded-xl transition-all"
                  >
                    <Link to={item.url}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isActive(item.url) ? 'bg-vibrant/10' : 'bg-transparent group-hover:bg-muted'}`}>
                        <item.icon className={`h-4 w-4 transition-colors ${isActive(item.url) ? 'text-vibrant' : ''}`} />
                      </div>
                      <span className="flex-1 font-medium">{item.title}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-50 group-hover:translate-x-0" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="group rounded-xl transition-all"
                  >
                    <Link to={item.url}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isActive(item.url) ? 'bg-vibrant/10' : 'bg-transparent group-hover:bg-muted'}`}>
                        <item.icon className={`h-4 w-4 transition-colors ${isActive(item.url) ? 'text-vibrant' : ''}`} />
                      </div>
                      <span className="flex-1 font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* Upgrade Card */}
      <div className="px-3 pb-3">
        <div className="rounded-2xl border border-vibrant/20 bg-gradient-to-br from-vibrant/10 to-transparent p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-vibrant" />
            <span className="text-sm font-semibold">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Unlock unlimited licenses, products, and more.
          </p>
          <Link
            to="/settings/billing"
            className="inline-flex items-center text-xs font-medium text-vibrant hover:text-vibrant/80 transition-colors"
          >
            View plans
            <ChevronRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-2">
          <ThemeSwitcher />
          <LogoutButton />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
