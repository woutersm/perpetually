import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { getCustomers, createCustomer } from "@/functions/customers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import {
  Plus,
  Users,
  Mail,
  Building2,
  Calendar,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_auth/customers/")({
  component: CustomersPage,
  loader: async () => {
    const customers = await getCustomers();
    return { customers };
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function CustomersPage() {
  const { customers } = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const submit = useServerFn(createCustomer);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      company: "",
    },
    onSubmit: async ({ value }) => {
      const result = await submit({
        data: {
          name: value.name,
          email: value.email,
          company: value.company || undefined,
        },
      });

      if (result) {
        setOpen(false);
        form.reset();
        router.invalidate();
      }
    },
  });

  return (
    <PageLayout
      title="Customers"
      description="Manage customers and their license assignments."
      breadcrumbs={[{ label: "Customers" }]}
      actions={
        <Button variant="vibrant" onClick={() => setOpen(true)} className="shadow-lg shadow-vibrant/25">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      }
    >
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No customers yet"
          description="Add your first customer to start issuing licenses."
          action={
            <Button variant="vibrant" onClick={() => setOpen(true)} className="shadow-lg shadow-vibrant/25">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-4 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
            <div className="col-span-4">Customer</div>
            <div className="col-span-3">Company</div>
            <div className="col-span-2">Licenses</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/40">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                to="/customers/$customerId"
                params={{ customerId: customer.id }}
                className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors group"
              >
                {/* Customer Name & Email */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-vibrant text-white font-semibold text-sm shadow-lg shadow-vibrant/25">
                    {getInitials(customer.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate group-hover:text-vibrant transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {customer.email}
                    </p>
                  </div>
                </div>

                {/* Company */}
                <div className="col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                  {customer.company ? (
                    <>
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">{customer.company}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Placeholder for future license count */}
                <div className="col-span-2 text-sm text-muted-foreground">
                  —
                </div>

                {/* Joined Date */}
                <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-end">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-vibrant transition-all group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 mb-4">
              <Users className="h-6 w-6 text-vibrant" />
            </div>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Register a new customer to issue licenses to.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Name</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="John Doe"
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Email is required"
                      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                        ? "Invalid email address"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="john@example.com"
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="company">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Company{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Acme Inc."
                      className="h-11"
                      ignorePasswordManagers
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="vibrant" disabled={!canSubmit} className="shadow-lg shadow-vibrant/25">
                    {isSubmitting ? "Adding..." : "Add Customer"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
