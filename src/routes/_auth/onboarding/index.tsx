import { createFileRoute, redirect } from "@tanstack/react-router";
import { getOnboardingStatus } from "@/functions/onboarding";

export const Route = createFileRoute("/_auth/onboarding/")({
  beforeLoad: async ({ context }) => {
    // If no organization, go to setup first
    if (!context.organization) {
      throw redirect({ to: "/onboarding/setup" });
    }
  },
  loader: async () => {
    const status = await getOnboardingStatus();

    // Redirect to appropriate step based on progress
    if (!status.isStripeConnected) {
      throw redirect({ to: "/onboarding/api" });
    }

    // Webhook step (optional - user can skip)
    if (!status.hasWebhookSecret) {
      throw redirect({ to: "/onboarding/webhook" });
    }

    if (!status.isOnboarded) {
      throw redirect({ to: "/onboarding/import" });
    }

    // Already onboarded, go to dashboard
    throw redirect({ to: "/products" });
  },
});
