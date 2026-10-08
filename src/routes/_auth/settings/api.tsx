import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { getApiKeys, createApiKey, deleteApiKey } from "@/functions/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Plus, Trash2, Copy, Check, AlertTriangle, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { SettingsTabs } from "@/components/top-nav";

export const Route = createFileRoute("/_auth/settings/api")({
  component: ApiKeysPage,
  loader: async () => {
    const keys = await getApiKeys();
    return { keys };
  },
});

function ApiKeysPage() {
  const { keys } = Route.useLoaderData();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submitCreate = useServerFn(createApiKey);
  const submitDelete = useServerFn(deleteApiKey);

  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      const result = await submitCreate({
        data: { name: value.name || undefined },
      });
      setCreateOpen(false);
      setNewKey(result.fullKey);
      form.reset();
      router.invalidate();
    },
  });

  const handleDelete = async () => {
    if (!deleteKeyId) return;
    await submitDelete({ data: { keyId: deleteKeyId } });
    setDeleteKeyId(null);
    toast.success("API key deleted");
    router.invalidate();
  };

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    toast.success("API key copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageLayout
      title="Settings"
      description="Manage API keys for server-side integration."
      tabs={<SettingsTabs />}
      actions={
        <Button variant="vibrant" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create key
        </Button>
      }
    >
      <div className="max-w-3xl">
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Secret keys</h2>
                <p className="text-sm text-muted-foreground">
                  {keys.length} {keys.length === 1 ? "key" : "keys"} created
                </p>
              </div>
            </div>
          </div>

          {keys.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Create an API key to integrate Perpetually with your server-side applications.
              </p>
              <Button variant="vibrant" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create your first key
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        {key.name || "Unnamed key"}
                      </p>
                      <p className="font-mono text-sm text-muted-foreground">
                        {key.keyMasked}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[140px]">
                      <Clock className="h-4 w-4" />
                      <span>
                        {key.lastUsedAt
                          ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                          : "Never used"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteKeyId(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              This key will have full access to your organization's resources.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Name (Optional)</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Production API Key"
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <p className="text-xs text-muted-foreground">
                      Give this key a name to help you identify it later
                    </p>
                  </div>
                )}
              </form.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="vibrant" disabled={!canSubmit}>
                    {isSubmitting ? "Creating..." : "Create key"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Show New Key Dialog */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 text-warning mt-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">Make sure to copy this key. You won't be able to see it again.</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex gap-3">
              <Input
                value={newKey || ""}
                readOnly
                className="font-mono text-sm h-11"
              />
              <Button variant="vibrant" size="icon" onClick={copyKey} className="h-11 w-11">
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteKeyId}
        onOpenChange={(open: boolean) => !open && setDeleteKeyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this API key. Any applications using
              this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
