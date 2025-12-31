import { createFileRoute, redirect } from "@tanstack/react-router";
import { getOnboardingStatus } from "@/functions/onboarding";

export const Route = createFileRoute("/_auth/onboarding/")({
  loader: async () => {
    const status = await getOnboardingStatus();

    // Redirect to appropriate step based on progress
    if (!status.isStripeConnected) {
      throw redirect({ to: "/onboarding/1" });
    }

    if (!status.isOnboarded) {
      throw redirect({ to: "/onboarding/import" });
    }

    // Already onboarded, go to dashboard
    throw redirect({ to: "/products" });
  },
});
