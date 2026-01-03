import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { getOnboardingStatus, connectWithApiKey } from "@/functions/onboarding";
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
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Key, ArrowRight, Shield, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/onboarding/1")({
  component: OnboardingStep1,
  beforeLoad: async ({ context }) => {
    if (!context.organization) {
      throw redirect({ to: "/onboarding/setup" });
    }
  },
  loader: async () => {
    const status = await getOnboardingStatus();

    if (status.isStripeConnected) {
      throw redirect({ to: "/onboarding/webhook" });
    }

    return { status };
  },
});

function OnboardingStep1() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitConnect = useServerFn(connectWithApiKey);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your Stripe API key");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      await submitConnect({ data: { apiKey: apiKey.trim() } });
      toast.success("Stripe connected successfully");
      navigate({ to: "/onboarding/webhook" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setConnecting(false);
    }
  };

  const requiredPermissions = [
    { name: "Products", access: "Read", reason: "Import your products" },
    { name: "Customers", access: "Read", reason: "Sync customer data" },
  ];

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
              <Key className="h-5 w-5" />
              Connect Your Stripe Account
            </CardTitle>
            <CardDescription>
              Create a restricted API key in Stripe with only the permissions
              Perpetually needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">You control the permissions</p>
                  <p className="text-muted-foreground">
                    Create a restricted key with only the access Perpetually
                    needs. You can revoke it anytime from your Stripe Dashboard.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Create a restricted key with these permissions:
                </p>
                <div className="border rounded-md divide-y">
                  {requiredPermissions.map((perm) => (
                    <div
                      key={perm.name}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>{perm.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs">
                          {perm.reason}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                          {perm.access}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <a
                  href="https://dashboard.stripe.com/apikeys/create?name=Perpetually&permissions%5B%5D=rak_product_read&permissions%5B%5D=rak_customer_read"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Create restricted key in Stripe
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">Restricted API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder="rk_live_... or rk_test_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Starts with <code className="bg-muted px-1 rounded">rk_live_</code> or{" "}
                <code className="bg-muted px-1 rounded">rk_test_</code>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={connecting || !apiKey.trim()}
              className="w-full"
              size="lg"
            >
              {connecting ? "Connecting..." : "Connect Stripe"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
