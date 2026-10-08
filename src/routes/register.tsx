import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, Sparkles, Mail, Users } from "lucide-react";
import db from "@/lib/db/db";
import { invitation, organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkSlugAvailable } from "@/functions/organizations";
import { getAppConfig } from "@/functions/demo";

// Fetch invitation details for pre-filling (public)
const getInvitationForRegister = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const [invite] = await db
      .select({
        email: invitation.email,
        organizationName: organization.name,
      })
      .from(invitation)
      .leftJoin(organization, eq(invitation.organizationId, organization.id))
      .where(eq(invitation.token, data.token))
      .limit(1);

    if (!invite) return null;
    return invite;
  });

// Validate search params
type RegisterSearch = {
  invite?: string;
};

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  beforeLoad: async () => {
    // Public demos hand out sandboxes instead of real accounts
    const { demoMode } = await getAppConfig();
    if (demoMode) throw redirect({ to: "/" });
  },
  component: RouteComponent,
  // @ts-expect-error - TanStack Router loader context type mismatch with validateSearch
  loader: async ({ search }: { search: RegisterSearch }) => {
    // If invite token provided, fetch invitation details
    if (search?.invite) {
      const invitation = await getInvitationForRegister({
        data: { token: search.invite },
      });
      return { invitation, inviteToken: search.invite };
    }
    return { invitation: null, inviteToken: null };
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const { invitation: inviteData, inviteToken } = Route.useLoaderData();
  const isInviteFlow = !!inviteData;

  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: inviteData?.email || "",
    password: "",
    confirmPassword: "",
    orgName: "",
    orgSlug: "",
  });

  const checkSlug = useServerFn(checkSlugAvailable);

  // Auto-generate slug from org name
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "orgName") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({
        ...prev,
        orgSlug: slug,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // For self-signup, require org name
    if (!isInviteFlow && !formData.orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    setLoading(true);

    try {
      // For self-signup, check if slug is available before creating account
      if (!isInviteFlow && formData.orgSlug) {
        const { available } = await checkSlug({ data: { slug: formData.orgSlug } });
        if (!available) {
          setError("Organization URL is already taken. Please choose a different one.");
          setLoading(false);
          return;
        }
      }

      const { error } = await authClient.signUp.email({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        // If email verification is required, show verify step
        if (error.message?.includes("verify") || error.code === "EMAIL_NOT_VERIFIED") {
          // Store org data for after login (only for self-signup)
          if (!isInviteFlow && formData.orgName) {
            localStorage.setItem(
              "pendingOrg",
              JSON.stringify({
                name: formData.orgName,
                slug: formData.orgSlug,
              })
            );
          }
          // Store invite token if present
          if (inviteToken) {
            localStorage.setItem("pendingInvite", inviteToken);
          }
          setStep("verify");
          return;
        }
        setError(error.message || "Sign up failed");
        return;
      }

      // Account created - store data and show verify step
      if (!isInviteFlow && formData.orgName) {
        localStorage.setItem(
          "pendingOrg",
          JSON.stringify({
            name: formData.orgName,
            slug: formData.orgSlug,
          })
        );
      }
      if (inviteToken) {
        localStorage.setItem("pendingInvite", inviteToken);
      }
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToLogin = () => {
    if (inviteToken) {
      navigate({ to: "/login", search: { invite: inviteToken } });
    } else {
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-vibrant shadow-lg shadow-vibrant/25 transition-transform group-hover:scale-105">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Perpetually</span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex">
        {/* Left side - Visual */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 border-r border-border/40 relative overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-vibrant/20 rounded-full blur-[100px] opacity-60" />
          <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-vibrant/10 rounded-full blur-[80px] opacity-40" />

          {/* Content */}
          <div className="relative z-10 max-w-md px-8">
            {isInviteFlow ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-vibrant/30 bg-vibrant/5 text-sm mb-8">
                  <Users className="h-3.5 w-3.5 text-vibrant" />
                  <span className="text-vibrant font-medium">Team Invitation</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  You're invited to join<br />
                  <span className="text-gradient-vibrant">{inviteData.organizationName}</span>
                </h2>
                <p className="text-muted-foreground mb-8">
                  Create your account to accept the invitation and join the team.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-vibrant/30 bg-vibrant/5 text-sm mb-8">
                  <Sparkles className="h-3.5 w-3.5 text-vibrant" />
                  <span className="text-vibrant font-medium">Free to start</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  Start selling software<br />
                  <span className="text-gradient-vibrant">in minutes</span>
                </h2>
                <p className="text-muted-foreground mb-8">
                  Join thousands of developers who use Perpetually to manage their software licenses.
                </p>
              </>
            )}

            {/* Features list */}
            <ul className="space-y-4">
              {[
                "Automatic license generation on purchase",
                "Customer portal for self-service",
                "Real-time activation tracking",
                "Stripe integration included",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-vibrant/10">
                    <Check className="h-3 w-3 text-vibrant" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-8">
            {step === "verify" ? (
              <div className="text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-vibrant/10 mx-auto">
                  <Mail className="h-8 w-8 text-vibrant" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                  <p className="text-muted-foreground">
                    We sent a verification link to{" "}
                    <span className="font-medium text-foreground">{formData.email}</span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to verify your account, then come back here to continue.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="vibrant"
                    className="w-full shadow-lg shadow-vibrant/25"
                    onClick={handleContinueToLogin}
                  >
                    Continue to login
                  </Button>
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await authClient.sendVerificationEmail({
                          email: formData.email,
                          callbackURL: "/dashboard",
                        });
                      } catch {
                        // Silently fail
                      }
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="text-sm font-medium text-vibrant hover:text-vibrant/80 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Resend verification email"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {isInviteFlow ? "Create your account" : "Get started"}
                  </h1>
                  <p className="text-muted-foreground">
                    {isInviteFlow
                      ? `Join ${inviteData.organizationName}`
                      : "Create your account and organization"}
                  </p>
                </div>

                {error && (
                  <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="John Doe"
                        className="h-11"
                        value={formData.name}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="h-11"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isInviteFlow}
                      />
                      {isInviteFlow && (
                        <p className="text-xs text-muted-foreground">
                          This invitation was sent to this email address
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="At least 8 characters"
                        className="h-11"
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        placeholder="Confirm your password"
                        className="h-11"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Organization fields - only for self-signup */}
                    {!isInviteFlow && (
                      <>
                        <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-background px-3 text-xs text-muted-foreground">
                              Your organization
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="orgName">Organization Name</Label>
                          <Input
                            id="orgName"
                            name="orgName"
                            type="text"
                            required
                            placeholder="Acme Inc"
                            className="h-11"
                            value={formData.orgName}
                            onChange={handleChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="orgSlug">Organization URL</Label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-lg bg-muted text-muted-foreground text-sm h-11">
                              perpetually.dev/
                            </span>
                            <Input
                              id="orgSlug"
                              name="orgSlug"
                              type="text"
                              required
                              pattern="[a-z0-9\-]+"
                              className="rounded-l-none h-11"
                              placeholder="acme"
                              value={formData.orgSlug}
                              onChange={handleChange}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Only lowercase letters, numbers, and hyphens
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    variant="vibrant"
                    className="w-full h-11 shadow-lg shadow-vibrant/25"
                  >
                    {loading ? "Creating account..." : "Create account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      search={inviteToken ? { invite: inviteToken } : undefined}
                      className="font-medium text-vibrant hover:text-vibrant/80 transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </form>
              </>
            )}

            <p className="text-center text-xs text-muted-foreground">
              By creating an account, you agree to our{" "}
              <a href="#" className="underline hover:text-foreground">Terms</a>
              {" "}and{" "}
              <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
