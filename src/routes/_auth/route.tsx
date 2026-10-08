import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { TopNav, SettingsTabs, CONTENT_WIDTH } from "@/components/top-nav";
import { cn } from "@/lib/utils";
import { getSessionFn, getTestModeFn } from "@/functions/sessions";
import { TestModeProvider } from "@/lib/test-mode-context";
import { SandboxBanner } from "@/components/demo/sandbox-banner";

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
  const { isTestMode, organization, user } = Route.useRouteContext();
  const { pathname } = useLocation();

  return (
    <TestModeProvider initialValue={isTestMode}>
      <div className="min-h-screen">
        <TopNav
          email={user.email}
          organizationName={organization?.name}
          isSandbox={!!organization?.sandboxExpiresAt}
        />
        {organization?.sandboxExpiresAt && (
          <SandboxBanner expiresAt={organization.sandboxExpiresAt} />
        )}
        {isTestMode && (
          <div className="border-b border-border bg-warning/5">
            <p className={cn(CONTENT_WIDTH, "py-2 text-xs text-warning")}>
              Showing test data from Stripe test mode
            </p>
          </div>
        )}
        {pathname.startsWith("/settings") && <SettingsTabs />}
        <Outlet />
      </div>
    </TestModeProvider>
  );
}
