import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import {
  getOnboardingStatus,
  saveWebhookSecret,
  getWebhookTestStatus,
} from "@/functions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Copy,
  ExternalLink,
  RefreshCw,
  CircleCheck,
  Clock,
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
      throw redirect({ to: "/onboarding/1" });
    }

    // If already has webhook secret, still show the page so they can test
    // but pre-fill the status

    const appUrl = import.meta.env.VITE_APP_URL || "http://localhost:3001";
    const webhookUrl = `${appUrl}/api/hooks/${status.organizationId}`;

    return { status, webhookUrl };
  },
});

function OnboardingWebhook() {
  const { status, webhookUrl } = Route.useLoaderData();
  const navigate = useNavigate();
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(status.hasWebhookSecret);
  const [testing, setTesting] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<Date | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const submitSave = useServerFn(saveWebhookSecret);
  const checkStatus = useServerFn(getWebhookTestStatus);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSave = async () => {
    if (!webhookSecret.trim()) {
      setError("Please enter the webhook signing secret");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await submitSave({ data: { webhookSecret: webhookSecret.trim() } });
      toast.success("Webhook secret saved");
      setSaved(true);
      setWebhookSecret(""); // Clear for security
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save webhook secret");
    } finally {
      setSaving(false);
    }
  };

  const startTesting = useCallback(() => {
    setTesting(true);
    setPollCount(0);
  }, []);

  // Poll for webhook test results
  useEffect(() => {
    if (!testing || !saved) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await checkStatus();
        if (result.lastTestedAt) {
          const testedAt = new Date(result.lastTestedAt);
          // Check if this is a new test (within last 60 seconds)
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
            // Stop after 30 attempts (60 seconds)
            setTesting(false);
            return 0;
          }
          return prev + 1;
        });
      } catch (e) {
        console.error("Failed to check webhook status:", e);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [testing, saved, checkStatus]);

  const requiredEvents = [
    "checkout.session.completed",
    "payment_intent.succeeded",
    "invoice.payment_succeeded",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "product.created",
    "product.updated",
    "product.deleted",
    "charge.refunded",
  ];

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
              Set Up Webhook
            </CardTitle>
            <CardDescription>
              Add a webhook endpoint in your Stripe Dashboard to receive payment
              notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connected status */}
            <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Connected to Stripe as{" "}
                <code className="bg-green-100 px-1 rounded">
                  {status.stripeConnectId}
                </code>
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="font-medium">Follow these steps:</h3>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                    1
                  </span>
                  <div className="space-y-2">
                    <p className="text-sm">
                      Open the{" "}
                      <a
                        href="https://dashboard.stripe.com/webhooks/create"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Stripe Webhooks page
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                    2
                  </span>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm">Copy this endpoint URL:</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md font-mono break-all">
                        {webhookUrl}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                    3
                  </span>
                  <div className="space-y-2">
                    <p className="text-sm">Select these events to listen to:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {requiredEvents.map((event) => (
                        <code
                          key={event}
                          className="bg-muted px-2 py-1 rounded font-mono"
                        >
                          {event}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                    4
                  </span>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm">
                      After creating the webhook, copy the{" "}
                      <strong>Signing secret</strong> (starts with{" "}
                      <code className="bg-muted px-1 rounded text-xs">whsec_</code>
                      ) and paste it below:
                    </p>
                    {!saved ? (
                      <div className="space-y-2">
                        <Label htmlFor="webhookSecret">
                          Webhook Signing Secret
                        </Label>
                        <Input
                          id="webhookSecret"
                          type="password"
                          placeholder="whsec_..."
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSave}
                          disabled={saving || !webhookSecret.trim()}
                        >
                          {saving ? "Saving..." : "Save Secret"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
                        <CircleCheck className="h-4 w-4" />
                        Webhook secret saved
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 5 - Test */}
                {saved && (
                  <div className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                      5
                    </span>
                    <div className="space-y-2 flex-1">
                      <p className="text-sm">
                        Test your webhook by clicking{" "}
                        <strong>&quot;Send test webhook&quot;</strong> in Stripe:
                      </p>
                      <div className="flex items-center gap-3">
                        <a
                          href="https://dashboard.stripe.com/webhooks"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Go to Webhooks
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
                              Listening for test...
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
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
                          <CircleCheck className="h-4 w-4" />
                          Webhook received at{" "}
                          {lastTestedAt.toLocaleTimeString()}
                        </div>
                      )}

                      {testing && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Waiting for webhook... ({30 - pollCount * 2}s remaining)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                onClick={() => navigate({ to: "/onboarding/1" })}
                disabled={saving}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <Button
                type="button"
                onClick={() => navigate({ to: "/onboarding/import" })}
                disabled={!saved || saving}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
