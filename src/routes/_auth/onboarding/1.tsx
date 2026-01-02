import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { getOnboardingStatus } from "@/functions/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { CreditCard, ArrowRight, Shield, Webhook, Package } from "lucide-react";

export const Route = createFileRoute("/_auth/onboarding/1")({
  component: OnboardingStep1,
  beforeLoad: async ({ context }) => {
    // If no organization, go to setup first
    if (!context.organization) {
      throw redirect({ to: "/onboarding/setup" });
    }
  },
  loader: async ({ location }) => {
    const status = await getOnboardingStatus();

    // If already connected, redirect to import step
    if (status.isStripeConnected) {
      throw redirect({ to: "/onboarding/import" });
    }

    // Check for OAuth error in URL
    const url = new URL(location.href, "http://localhost");
    const error = url.searchParams.get("error");

    return { status, error };
  },
});

function OnboardingStep1() {
  const { status, error } = Route.useLoaderData();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    window.location.href = `/api/stripe/connect?organizationId=${status.organizationId}`;
  };

  return (
    <PageLayout title="Onboarding">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            1
          </span>
          <span>Connect</span>
          <ArrowRight className="h-4 w-4" />
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            2
          </span>
          <span>Import</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Connect Your Stripe Account
            </CardTitle>
            <CardDescription>
              Securely connect your existing Stripe account to sync products and
              receive payment notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clicking &quot;Connect with Stripe&quot; will:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm">
                  <Shield className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                  <span>Securely authenticate with your Stripe account via OAuth</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Webhook className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                  <span>Automatically set up webhook notifications for payments</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Package className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                  <span>Allow importing your existing products</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-2">
                You can disconnect at any time from your settings or Stripe dashboard.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error === "access_denied"
                  ? "You denied access to your Stripe account. Please try again."
                  : error}
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
              size="lg"
            >
              {connecting ? (
                "Redirecting to Stripe..."
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Connect with Stripe
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
