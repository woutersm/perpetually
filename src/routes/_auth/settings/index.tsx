import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { getOrganizationSettings, updateOrganizationSettings } from "@/functions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Copy, Check, Link as LinkIcon, Trash2, CreditCard, Unplug } from "lucide-react";
import { toast } from "sonner";
import { disconnectStripe } from "@/functions/onboarding";
import { SettingsTabs } from "@/components/top-nav";

export const Route = createFileRoute("/_auth/settings/")({
  component: SettingsPage,
  loader: async () => {
    const settings = await getOrganizationSettings();
    return { settings };
  },
});

function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid && (
        <p className="text-sm text-destructive mt-1">
          {field.state.meta.errors.join(", ")}
        </p>
      )}
    </>
  );
}

function SettingsPage() {
  const { settings } = Route.useLoaderData();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const submit = useServerFn(updateOrganizationSettings);
  const submitDisconnect = useServerFn(disconnectStripe);

  const form = useForm({
    defaultValues: {
      name: settings.name,
      slug: settings.slug,
    },
    onSubmit: async ({ value }) => {
      await submit({ data: value });
      toast.success("Settings saved");
      router.invalidate();
    },
  });

  const copyApiKey = async () => {
    await navigator.clipboard.writeText(settings.apiKey);
    setCopied(true);
    toast.success("API key copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Stripe account? This will disable payment processing.")) {
      return;
    }
    setDisconnecting(true);
    try {
      await submitDisconnect();
      toast.success("Stripe disconnected");
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <PageLayout
      title="Settings"
      description="Manage your organization details and configuration."
      tabs={<SettingsTabs />}
    >
      <div className="space-y-6 max-w-3xl">
        {/* Organization Settings */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Organization</h2>
                <p className="text-sm text-muted-foreground">
                  Your organization details
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-5"
            >
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Organization name</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="slug"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Slug is required"
                      : !/^[a-z0-9-]+$/.test(value)
                        ? "Only lowercase letters, numbers, and hyphens"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Organization slug</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 border border-r-0 border-border rounded-l-lg bg-muted text-muted-foreground text-sm h-11">
                        <LinkIcon className="h-3.5 w-3.5 mr-2" />
                        perpetually.dev/
                      </span>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="rounded-l-none font-mono h-11"
                        ignorePasswordManagers
                      />
                    </div>
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <div className="pt-2">
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      variant="vibrant"
                      disabled={!canSubmit}
                     
                    >
                      {isSubmitting ? "Saving..." : "Save changes"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </form>
          </div>
        </div>

        {/* API Key */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Public API key</h2>
                <p className="text-sm text-muted-foreground">
                  Use this key for client-side license validation
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              This key is safe to include in your application. It can only be used
              to validate licenses, not modify them.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={settings.apiKey}
                  readOnly
                  className="font-mono text-sm bg-muted/30 h-11"
                />
              </div>
              <Button variant="outline" size="icon" onClick={copyApiKey} className="h-11 w-11">
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Stripe Connect */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Stripe</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your Stripe connection for payment processing
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {settings.stripeConnectId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-md bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Connected</p>
                      <p className="text-sm text-green-600">
                        {settings.stripeConnectedAt && (
                          <span>
                            Connected {new Date(settings.stripeConnectedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Unplug className="h-4 w-4 mr-2" />
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your Stripe account is connected. Webhooks are automatically configured to process payments.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your Stripe account to start processing payments and issuing licenses automatically.
                </p>
                <Button
                  onClick={() => window.location.href = `/api/stripe/connect?organizationId=${settings.id}`}
                  variant="vibrant"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Connect Stripe
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium text-destructive">Danger zone</h2>
                <p className="text-sm text-muted-foreground">
                  Irreversible actions for your organization
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your organization and all its data
                </p>
              </div>
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
