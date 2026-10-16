import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { getSessionFn } from "@/functions/sessions";
import { getAppConfig } from "@/functions/demo";
import { TryDemoButton } from "@/components/try-demo-button";
import { Wordmark } from "@/components/top-nav";

// Validate search params
type LoginSearch = {
  invite?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (session?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getAppConfig(),
  component: RouteComponent,
});

function RouteComponent() {
  const { demoMode } = Route.useLoaderData();
  const navigate = useNavigate();
  const { invite: inviteToken } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Check for pending invite in localStorage (from registration flow)
  useEffect(() => {
    const pendingInvite = localStorage.getItem("pendingInvite");
    if (pendingInvite && !inviteToken) {
      // Redirect to login with the invite token
      navigate({ to: "/login", search: { invite: pendingInvite }, replace: true });
    }
  }, [inviteToken, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
        rememberMe: true,
      });

      if (error) {
        setError(error.message || "Sign in failed");
        return;
      }

      if (data) {
        // Clear any pending invite from localStorage
        const pendingInvite = localStorage.getItem("pendingInvite");
        if (pendingInvite) {
          localStorage.removeItem("pendingInvite");
        }

        // Redirect to invite page if invite token is present
        const tokenToUse = inviteToken || pendingInvite;
        if (tokenToUse) {
          navigate({ to: "/invite/$token", params: { token: tokenToUse } });
        } else {
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Wordmark />
          </Link>
          {demoMode ? (
            <TryDemoButton variant="vibrant" size="sm" label="Try the demo" />
          ) : (
            <Button variant="vibrant" size="sm" asChild>
              <Link to="/register" search={inviteToken ? { invite: inviteToken } : undefined}>
                Get started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-medium tracking-tight">Welcome back</h1>
              <p className="text-muted-foreground">
                {inviteToken
                  ? "Sign in to accept your invitation"
                  : "Sign in to your account to continue"}
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-4">
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
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-vibrant hover:text-vibrant/80 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Enter your password"
                    className="h-11"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="vibrant"
                className="w-full h-11"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              {demoMode ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Just looking around? Get a private sandbox with sample data.
                  </p>
                  <TryDemoButton type="button" variant="outline" className="w-full h-11" />
                </div>
              ) : (
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  search={inviteToken ? { invite: inviteToken } : undefined}
                  className="font-medium text-vibrant hover:text-vibrant/80 transition-colors"
                >
                  Sign up
                </Link>
              </p>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
