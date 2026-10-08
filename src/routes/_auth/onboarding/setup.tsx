import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
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
import { useState, useEffect } from "react";
import { Building, ArrowRight, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createOrganization } from "@/functions/organizations";

export const Route = createFileRoute("/_auth/onboarding/setup")({
  component: OnboardingSetup,
  beforeLoad: async ({ context }) => {
    // If user already has an organization, skip to API setup
    if (context.organization) {
      throw redirect({ to: "/onboarding/api" });
    }
  },
});

function OnboardingSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  });

  const createOrg = useServerFn(createOrganization);

  // Check for pending org data from registration
  useEffect(() => {
    const pendingOrg = localStorage.getItem("pendingOrg");
    if (pendingOrg) {
      try {
        const { name, slug } = JSON.parse(pendingOrg);
        if (name && slug) {
          // Auto-create the organization
          setAutoCreating(true);
          createOrg({ data: { name, slug } })
            .then(() => {
              localStorage.removeItem("pendingOrg");
              navigate({ to: "/onboarding/api" });
            })
            .catch((err) => {
              // If auto-create fails, show the form with pre-filled data
              setFormData({ name, slug });
              setError(err instanceof Error ? err.message : "Failed to create organization");
              setAutoCreating(false);
              localStorage.removeItem("pendingOrg");
            });
        }
      } catch {
        localStorage.removeItem("pendingOrg");
      }
    }
  }, [createOrg, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({
        ...prev,
        slug,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.slug) {
      setError("Organization name and URL are required");
      return;
    }

    setLoading(true);

    try {
      await createOrg({
        data: {
          name: formData.name,
          slug: formData.slug,
        },
      });

      localStorage.removeItem("pendingOrg");
      navigate({ to: "/onboarding/api" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auto-creating
  if (autoCreating) {
    return (
      <PageLayout title="Onboarding">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Setting up your organization...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Onboarding">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            1
          </span>
          <span>Setup</span>
          <ArrowRight className="h-4 w-4" />
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            2
          </span>
          <span>Connect</span>
          <ArrowRight className="h-4 w-4" />
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            3
          </span>
          <span>Import</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Set up your organization
            </CardTitle>
            <CardDescription>
              Create your organization to start managing licenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Acme Inc"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Organization URL</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted text-muted-foreground text-sm">
                      perpetually.dev/portal/
                    </span>
                    <Input
                      id="slug"
                      name="slug"
                      type="text"
                      required
                      pattern="[a-z0-9\-]+"
                      className="rounded-l-none"
                      placeholder="acme"
                      value={formData.slug}
                      onChange={handleChange}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the URL your customers will use to access the portal.
                    Only lowercase letters, numbers, and hyphens.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Creating..." : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
