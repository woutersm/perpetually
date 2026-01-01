import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import {
  getTeamMembers,
  updateTeamMemberRole,
  removeTeamMember,
  getInvitations,
  inviteTeamMember,
  cancelInvitation,
  resendInvitation,
} from "@/functions/settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import {
  Users,
  Trash2,
  Crown,
  Shield,
  User,
  Plus,
  Mail,
  Clock,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/settings/team")({
  component: TeamPage,
  loader: async () => {
    const [members, invitations] = await Promise.all([
      getTeamMembers(),
      getInvitations(),
    ]);
    return { members, invitations };
  },
});

type TeamRole = "owner" | "admin" | "member";

function TeamPage() {
  const { members, invitations } = Route.useLoaderData();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);

  const submitUpdateRole = useServerFn(updateTeamMemberRole);
  const submitRemove = useServerFn(removeTeamMember);
  const submitInvite = useServerFn(inviteTeamMember);
  const submitCancel = useServerFn(cancelInvitation);
  const submitResend = useServerFn(resendInvitation);

  const handleRoleChange = async (membershipId: string, role: TeamRole) => {
    await submitUpdateRole({ data: { membershipId, role } });
    toast.success("Role updated");
    router.invalidate();
  };

  const handleRemove = async () => {
    if (!removeMemberId) return;
    await submitRemove({ data: { membershipId: removeMemberId } });
    setRemoveMemberId(null);
    toast.success("Team member removed");
    router.invalidate();
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      await submitInvite({ data: { email: inviteEmail } });
      toast.success("Invitation sent!");
      setInviteOpen(false);
      setInviteEmail("");
      router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!cancelInviteId) return;
    await submitCancel({ data: { invitationId: cancelInviteId } });
    setCancelInviteId(null);
    toast.success("Invitation cancelled");
    router.invalidate();
  };

  const handleResend = async (invitationId: string) => {
    try {
      await submitResend({ data: { invitationId } });
      toast.success("Invitation resent");
    } catch (error) {
      toast.error("Failed to resend invitation");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3.5 w-3.5" />;
      case "admin":
        return <Shield className="h-3.5 w-3.5" />;
      default:
        return <User className="h-3.5 w-3.5" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <PageLayout
      title="Team"
      description="Manage who has access to your organization."
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: "Team" },
      ]}
      actions={
        <Button
          variant="vibrant"
          className="shadow-lg shadow-vibrant/25"
          onClick={() => setInviteOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Team Members */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="border-b border-border/40 bg-muted/30 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vibrant/10">
                <Users className="h-5 w-5 text-vibrant" />
              </div>
              <div>
                <h2 className="font-semibold">Team Members</h2>
                <p className="text-sm text-muted-foreground">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </p>
              </div>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No team members</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Invite team members to collaborate on your organization.
              </p>
              <Button
                variant="vibrant"
                className="shadow-lg shadow-vibrant/25"
                onClick={() => setInviteOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Invite Member
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {member.user?.image ? (
                      <img
                        src={member.user.image}
                        alt={member.user.name || ""}
                        className="h-11 w-11 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-vibrant text-white font-semibold text-sm shadow-lg shadow-vibrant/25">
                        {member.user?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{member.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {member.role === "owner" ? (
                      <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1.5">
                        {getRoleIcon(member.role)}
                        Owner
                      </Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(value: TeamRole) =>
                          handleRoleChange(member.id, value)
                        }
                      >
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5" />
                              Member
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <span className="text-sm text-muted-foreground min-w-[100px]">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </span>

                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRemoveMemberId(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="border-b border-border/40 bg-muted/30 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
                  <Mail className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold">Pending Invitations</h2>
                  <p className="text-sm text-muted-foreground">
                    {invitations.length} pending
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border/40">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Expires{" "}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(invite.id)}
                    >
                      <RotateCw className="h-4 w-4 mr-1.5" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCancelInviteId(invite.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization. They'll receive an email
              with a link to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="vibrant"
              onClick={handleInvite}
              disabled={!inviteEmail || inviteLoading}
              className="shadow-lg shadow-vibrant/25"
            >
              {inviteLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog
        open={!!removeMemberId}
        onOpenChange={(open: boolean) => !open && setRemoveMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove their access to the organization. They can be
              invited again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog
        open={!!cancelInviteId}
        onOpenChange={(open: boolean) => !open && setCancelInviteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation link will no longer work. You can send a new invitation
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
