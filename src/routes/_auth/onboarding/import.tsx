import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import {
  getOnboardingStatus,
  importProductsFromStripe,
  completeOnboarding,
} from "@/functions/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Package,
  ArrowRight,
  ArrowLeft,
  Check,
  Download,
  SkipForward,
} from "lucide-react";

export const Route = createFileRoute("/_auth/onboarding/import")({
  component: OnboardingImport,
  beforeLoad: async ({ context }) => {
    // If no organization, go to setup first
    if (!context.organization) {
      throw redirect({ to: "/onboarding/setup" });
    }
  },
  loader: async () => {
    const status = await getOnboardingStatus();

    // If not connected to Stripe, redirect back to step 1
    if (!status.isStripeConnected) {
      throw redirect({ to: "/onboarding/1" });
    }

    // If no webhook secret, redirect to webhook setup
    if (!status.hasWebhookSecret) {
      throw redirect({ to: "/onboarding/webhook" });
    }

    // If already onboarded, go to products
    if (status.isOnboarded) {
      throw redirect({ to: "/products" });
    }

    return { status };
  },
});

function OnboardingImport() {
  const { status } = Route.useLoaderData();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    total: number;
  } | null>(null);

  const submitImport = useServerFn(importProductsFromStripe);
  const submitSkip = useServerFn(completeOnboarding);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await submitImport();
      setResult({ imported: res.imported, total: res.total });
      // Wait a moment to show the result
      setTimeout(() => {
        navigate({ to: "/products" });
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import products");
      setImporting(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    setError(null);
    try {
      await submitSkip();
      navigate({ to: "/products" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete setup");
      setSkipping(false);
    }
  };

  return (
    <PageLayout title="Onboarding">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-medium">
            <Check className="h-3 w-3" />
          </span>
          <span>Connect</span>
          <ArrowRight className="h-4 w-4" />
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-medium">
            <Check className="h-3 w-3" />
          </span>
          <span>Webhook</span>
          <ArrowRight className="h-4 w-4" />
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            3
          </span>
          <span>Import</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Import Products
            </CardTitle>
            <CardDescription>
              Import your existing products from Stripe to start managing
              licenses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {result ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Import Complete!</h3>
                <p className="text-muted-foreground mt-2">
                  Imported {result.imported} of {result.total} products
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Redirecting to your products...
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800">
                    <p className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Connected to Stripe as{" "}
                      <code className="bg-green-100 px-1 rounded">
                        {status.stripeConnectId}
                      </code>
                    </p>
                  </div>
                  <p>
                    Import your active products from Stripe. This will create a
                    product entry for each active product in your Stripe
                    account.
                  </p>
                  <p className="text-muted-foreground">
                    You can also skip this step and create products manually
                    later.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: "/onboarding/webhook" })}
                    disabled={importing || skipping}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSkip}
                      disabled={importing || skipping}
                    >
                      {skipping ? "Skipping..." : "Skip"}
                      <SkipForward className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleImport}
                      disabled={importing || skipping}
                    >
                      {importing ? "Importing..." : "Import Products"}
                      <Download className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
