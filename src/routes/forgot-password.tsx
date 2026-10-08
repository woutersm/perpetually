import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/top-nav";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // @ts-expect-error - forgetPassword exists at runtime but types may be incomplete
      const { error } = await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      });

      if (error) {
        setError(error.message || "Failed to send reset email");
        return;
      }

      setSent(true);
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
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to login
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {sent ? (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-medium tracking-tight">Check your email</h1>
                <p className="text-muted-foreground">
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="font-medium text-vibrant hover:text-vibrant/80 transition-colors"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-medium tracking-tight">Forgot your password?</h1>
                <p className="text-muted-foreground">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="vibrant"
                  className="w-full h-11"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-vibrant hover:text-vibrant/80 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
