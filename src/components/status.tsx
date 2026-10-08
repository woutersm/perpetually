import { Badge } from "@/components/ui/badge";

export const statuses = [
  {
    value: "active",
    label: "Active",
    variant: "outline-success" as const,
  },
  {
    value: "pending",
    label: "Pending",
    variant: "outline-warning" as const,
  },
  {
    value: "inactive",
    label: "Inactive",
    variant: "outline-muted" as const,
  },
  {
    value: "disabled",
    label: "Disabled",
    variant: "outline-destructive" as const,
  },
  {
    value: "expired",
    label: "Expired",
    variant: "outline-warning" as const,
  },
  {
    value: "revoked",
    label: "Revoked",
    variant: "outline-destructive" as const,
  },
  {
    value: "suspended",
    label: "Suspended",
    variant: "outline-destructive" as const,
  },
];

export function Status({ status }: { status: string }) {
  const s = statuses.find((s) => s.value === status.toLowerCase());

  if (!s) {
    return <Badge variant="outline-muted">{status}</Badge>;
  }

  return <Badge variant={s.variant}>{s.label}</Badge>;
}
