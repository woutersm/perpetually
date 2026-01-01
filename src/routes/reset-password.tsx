import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: formData.password,
      });

      if (error) {
        setError(error.message || "Failed to reset password");
        return;
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Check if we have a token in the URL
  const hasToken = typeof window !== "undefined" && window.location.search.includes("token=");

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
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {success ? (
            <div className="text-center space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Password reset!</h1>
                <p className="text-muted-foreground">
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </div>
              <Button variant="vibrant" className="shadow-lg shadow-vibrant/25" asChild>
                <Link to="/login">Continue to login</Link>
              </Button>
            </div>
          ) : !hasToken ? (
            <div className="text-center space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 mx-auto">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Invalid link</h1>
                <p className="text-muted-foreground">
                  This password reset link is invalid or has expired.
                </p>
              </div>
              <Button variant="vibrant" className="shadow-lg shadow-vibrant/25" asChild>
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-vibrant/10 mx-auto mb-4">
                  <Lock className="h-7 w-7 text-vibrant" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
                <p className="text-muted-foreground">Enter your new password below</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
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
                    <Label htmlFor="confirmPassword">Confirm password</Label>
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
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="vibrant"
                  className="w-full h-11 shadow-lg shadow-vibrant/25"
                >
                  {loading ? "Resetting..." : "Reset password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
