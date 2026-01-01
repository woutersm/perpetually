import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Key } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
        callbackURL: "/dashboard",
      });

      if (error) {
        setError(error.message || "Sign in failed");
        return;
      }

      if (data) {
        navigate({ to: "/dashboard" });
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
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-vibrant shadow-lg shadow-vibrant/25 transition-transform group-hover:scale-105">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Perpetually</span>
          </Link>
          <Button variant="vibrant" size="sm" className="shadow-lg shadow-vibrant/25" asChild>
            <Link to="/register">
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4">
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
                className="w-full h-11 shadow-lg shadow-vibrant/25"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-vibrant hover:text-vibrant/80 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Right side - Visual */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 border-l border-border/40 relative overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-vibrant/20 rounded-full blur-[100px] opacity-60" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-vibrant/10 rounded-full blur-[80px] opacity-40" />

          {/* Content */}
          <div className="relative z-10 max-w-md text-center px-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-vibrant shadow-xl shadow-vibrant/30 mx-auto mb-8">
              <Key className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              License Management<br />
              <span className="text-gradient-vibrant">Made Simple</span>
            </h2>
            <p className="text-muted-foreground">
              Generate, validate, and manage software licenses with a modern API.
              Built for developers who ship.
            </p>

            {/* Mini stats */}
            <div className="flex justify-center gap-8 mt-8">
              {[
                { value: "10M+", label: "Validations" },
                { value: "99.9%", label: "Uptime" },
                { value: "<50ms", label: "Latency" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-bold text-vibrant">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
