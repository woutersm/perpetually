import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSessionFn } from "@/functions/sessions";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    // Check if user has an organization
    if (!session.currentOrganization) {
      // Only redirect if not already on onboarding
      if (!location.pathname.startsWith("/onboarding")) {
        throw redirect({ to: "/onboarding" });
      }
    } else if (!session.currentOrganization.isOnboarded) {
      // Org exists but not onboarded - redirect to onboarding
      // Only redirect if not already on onboarding
      if (!location.pathname.startsWith("/onboarding")) {
        throw redirect({ to: "/onboarding" });
      }
    }

    return {
      user: session.user,
      organization: session.currentOrganization,
      memberships: session.memberships,
    };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <Outlet />
    </SidebarProvider>
  );
}
