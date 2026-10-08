import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import db from "@/lib/db/db";
import { invitation, organization, user, membership } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { XCircle, AlertCircle } from "lucide-react";
import { getSessionFn } from "@/functions/sessions";
import { toast } from "sonner";
import { Wordmark } from "@/components/top-nav";

// Get invitation details (public)
const getInvitationDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const [invite] = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        organization: {
          id: organization.id,
          name: organization.name,
        },
        invitedBy: {
          name: user.name,
        },
      })
      .from(invitation)
      .leftJoin(organization, eq(invitation.organizationId, organization.id))
      .leftJoin(user, eq(invitation.invitedBy, user.id))
      .where(eq(invitation.token, data.token))
      .limit(1);

    if (!invite) {
      return { error: "not_found" as const };
    }

    if (invite.expiresAt < new Date()) {
      return { error: "expired" as const };
    }

    return { invitation: invite };
  });

// Accept invitation (requires auth)
const acceptInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    // Get current session
    const session = await getSessionFn();
    if (!session?.user) {
      throw new Error("You must be logged in to accept this invitation");
    }

    // Get invitation
    const [invite] = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.token, data.token),
          gt(invitation.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invite) {
      throw new Error("Invitation not found or expired");
    }

    // Check if email matches
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      throw new Error(
        `This invitation was sent to ${invite.email}. Please sign in with that email address.`
      );
    }

    // Check if already a member
    const [existingMembership] = await db
      .select({ id: membership.id })
      .from(membership)
      .where(
        and(
          eq(membership.userId, session.user.id),
          eq(membership.organizationId, invite.organizationId)
        )
      )
      .limit(1);

    if (existingMembership) {
      // Already a member - delete the invitation and redirect
      await db.delete(invitation).where(eq(invitation.id, invite.id));
      return { success: true, alreadyMember: true };
    }

    // Create membership
    await db.insert(membership).values({
      userId: session.user.id,
      organizationId: invite.organizationId,
      role: invite.role,
    });

    // Delete invitation
    await db.delete(invitation).where(eq(invitation.id, invite.id));

    return { success: true, organizationId: invite.organizationId };
  });

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
  loader: async ({ params }) => {
    const [inviteResult, session] = await Promise.all([
      getInvitationDetails({ data: { token: params.token } }),
      getSessionFn(),
    ]);
    return { inviteResult, session, token: params.token };
  },
});

function InvitePage() {
  const { inviteResult, session, token } = Route.useLoaderData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const submitAccept = useServerFn(acceptInvitation);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const result = await submitAccept({ data: { token } });
      if (result.success) {
        setAccepted(true);
        toast.success("Welcome to the team!");
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate({ to: "/dashboard" });
        }, 2000);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  // Error states
  if ("error" in inviteResult) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-destructive/10 mx-auto">
              {inviteResult.error === "expired" ? (
                <AlertCircle className="h-8 w-8 text-amber-500" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight">
                {inviteResult.error === "expired"
                  ? "Invitation Expired"
                  : "Invitation Not Found"}
              </h1>
              <p className="text-muted-foreground">
                {inviteResult.error === "expired"
                  ? "This invitation has expired. Please ask for a new invitation."
                  : "This invitation link is invalid or has already been used."}
              </p>
            </div>
            <Button variant="vibrant" asChild>
              <Link to="/">Go to Homepage</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { invitation: invite } = inviteResult;

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight">You're in!</h1>
              <p className="text-muted-foreground">
                You've joined <strong>{invite.organization?.name}</strong>. Redirecting to dashboard...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Check if user needs to sign in/up
  const isLoggedIn = !!session?.user;
  const emailMatches =
    isLoggedIn && session.user.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight">You're invited!</h1>
              <p className="text-muted-foreground">
                {invite.invitedBy?.name || "Someone"} invited you to join
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <p className="text-lg font-medium">{invite.organization?.name}</p>
              <p className="text-sm text-muted-foreground">as a team member</p>
            </div>
          </div>

          <div className="space-y-4">
            {!isLoggedIn ? (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  Sign in or create an account with <strong>{invite.email}</strong> to accept this
                  invitation.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="vibrant"
                    className="w-full"
                    asChild
                  >
                    <Link to="/register" search={{ invite: token }}>
                      Create account
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/login" search={{ invite: token }}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              </>
            ) : !emailMatches ? (
              <>
                <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm text-amber-800">
                    You're signed in as <strong>{session.user.email}</strong>, but this invitation
                    was sent to <strong>{invite.email}</strong>.
                  </p>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Please sign out and sign in with the correct email address.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login" search={{ invite: token }}>
                    Sign in with different account
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  Signed in as <strong>{session.user.email}</strong>
                </p>
                <Button
                  variant="vibrant"
                  className="w-full"
                  onClick={handleAccept}
                  disabled={loading}
                >
                  {loading ? "Joining..." : "Accept invitation"}
                </Button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            This invitation expires on{" "}
            {new Date(invite.expiresAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <Wordmark />
        </Link>
      </div>
    </header>
  );
}
