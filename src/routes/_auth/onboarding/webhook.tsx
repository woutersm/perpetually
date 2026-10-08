import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import {
  getOnboardingStatus,
  createWebhookEndpoint,
  getWebhookTestStatus,
} from "@/functions/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Webhook,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  RefreshCw,
  CircleCheck,
  Clock,
  Loader2,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/onboarding/webhook")({
  component: OnboardingWebhook,
  beforeLoad: async ({ context }) => {
    if (!context.organization) {
      throw redirect({ to: "/onboarding/setup" });
    }
  },
  loader: async () => {
    const status = await getOnboardingStatus();

    if (!status.isStripeConnected) {
      throw redirect({ to: "/onboarding/api" });
    }

    const appUrl = import.meta.env.VITE_APP_URL || "http://localhost:3001";
    const webhookUrl = `${appUrl}/api/hooks/${status.organizationId}`;
    const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

    return { status, webhookUrl, isLocalhost };
  },
});

function OnboardingWebhook() {
  const { status, webhookUrl, isLocalhost } = Route.useLoaderData();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(status.hasWebhookSecret);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<Date | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const submitCreate = useServerFn(createWebhookEndpoint);
  const checkStatus = useServerFn(getWebhookTestStatus);

  // Auto-create webhook on mount (only if not localhost)
  useEffect(() => {
    if (!isLocalhost && !created && !creating && !error) {
      handleCreateWebhook();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateWebhook = async () => {
    setCreating(true);
    setError(null);

    try {
      const result = await submitCreate({ data: { webhookUrl } });
      if (result.alreadyExists) {
        toast.success("Webhook already configured");
      } else {
        toast.success("Webhook created successfully");
      }
      setCreated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setCreating(false);
    }
  };

  const handleSkip = () => {
    toast.info("Webhook setup skipped - you can configure it later in Settings");
    navigate({ to: "/onboarding/import" });
  };

  const startTesting = useCallback(() => {
    setTesting(true);
    setPollCount(0);
  }, []);

  // Poll for webhook test results
  useEffect(() => {
    if (!testing || !created) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await checkStatus();
        if (result.lastTestedAt) {
          const testedAt = new Date(result.lastTestedAt);
          const now = new Date();
          const diffSeconds = (now.getTime() - testedAt.getTime()) / 1000;

          if (diffSeconds < 60) {
            setLastTestedAt(testedAt);
            setTesting(false);
            toast.success("Webhook test received!");
          }
        }

        setPollCount((prev) => {
          if (prev >= 30) {
            setTesting(false);
            return 0;
          }
          return prev + 1;
        });
      } catch (e) {
        console.error("Failed to check webhook status:", e);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [testing, created, checkStatus]);

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
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            2
          </span>
          <span>Webhook</span>
          <ArrowRight className="h-4 w-4" />
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            3
          </span>
          <span>Import</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Set up webhook
            </CardTitle>
            <CardDescription>
              Configure webhook to receive payment notifications from Stripe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connected status */}
            <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Stripe connected successfully
              </p>
            </div>

            {/* Localhost mode */}
            {isLocalhost && !created && (
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <Terminal className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Local development detected
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Stripe can't send webhooks to localhost. For local development,
                        use the{" "}
                        <a
                          href="https://stripe.com/docs/stripe-cli"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium"
                        >
                          Stripe CLI
                        </a>{" "}
                        to forward webhooks to your local server.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-md border bg-muted/30">
                  <h3 className="text-sm font-medium mb-2">Using Stripe CLI</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Run this command to forward webhooks locally:
                  </p>
                  <code className="block text-xs bg-muted px-3 py-2 rounded-md font-mono break-all">
                    stripe listen --forward-to {webhookUrl}
                  </code>
                </div>

                <Button
                  onClick={handleSkip}
                  className="w-full"
                >
                  Continue without webhook
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Creating state (non-localhost) */}
            {!isLocalhost && creating && (
              <div className="p-6 rounded-md border bg-muted/30 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Creating webhook endpoint in Stripe...
                </p>
              </div>
            )}

            {/* Error state (non-localhost) */}
            {!isLocalhost && error && (
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm text-destructive font-medium">
                      Failed to create webhook
                    </p>
                    <p className="text-sm text-destructive/80">{error}</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCreateWebhook}
                        disabled={creating}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try again
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: "/onboarding/import" })}
                      >
                        Skip for now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success state */}
            {created && !creating && (
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-green-50 border border-green-200">
                  <div className="flex items-start gap-3">
                    <CircleCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Webhook configured successfully
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Your Stripe account is now set up to send payment
                        notifications to Perpetually.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Optional test section */}
                <div className="p-4 rounded-md border bg-muted/30">
                  <h3 className="text-sm font-medium mb-2">
                    Test webhook (optional)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Send a test event from Stripe to verify everything is
                    working.
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://dashboard.stripe.com/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Go to Stripe Webhooks
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={startTesting}
                      disabled={testing}
                    >
                      {testing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Listening...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Start listening
                        </>
                      )}
                    </Button>
                  </div>

                  {lastTestedAt && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md mt-3">
                      <CircleCheck className="h-4 w-4" />
                      Webhook received at {lastTestedAt.toLocaleTimeString()}
                    </div>
                  )}

                  {testing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                      <Clock className="h-4 w-4" />
                      Waiting for webhook... ({30 - pollCount * 2}s remaining)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation buttons - only show if not in localhost mode (localhost has its own buttons) */}
            {(!isLocalhost || created) && (
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/onboarding/api" })}
                  disabled={creating}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={() => navigate({ to: "/onboarding/import" })}
                  disabled={(!created && !error) || creating}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
