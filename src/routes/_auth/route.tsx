import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSessionFn, getTestModeFn } from "@/functions/sessions";
import { TestModeProvider } from "@/lib/test-mode-context";
import { FlaskConical } from "lucide-react";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    // Fetch session and test mode in parallel
    const [session, isTestMode] = await Promise.all([
      getSessionFn(),
      getTestModeFn(),
    ]);

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    // Check if user has an organization
    if (!session.currentOrganization) {
      // No organization - redirect to setup
      if (!location.pathname.startsWith("/onboarding/setup")) {
        throw redirect({ to: "/onboarding/setup" });
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
      isTestMode,
    };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { isTestMode } = Route.useRouteContext();

  return (
    <TestModeProvider initialValue={isTestMode}>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Test Mode Banner */}
          {isTestMode && (
            <div className="bg-warning/10 border-b border-warning/30 px-4 py-2">
              <div className="flex items-center justify-center gap-2 text-sm">
                <FlaskConical className="h-4 w-4 text-warning" />
                <span className="text-warning font-medium">Test Mode</span>
                <span className="text-warning/80">
                  — Viewing test data from Stripe test mode
                </span>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </SidebarProvider>
    </TestModeProvider>
  );
}
