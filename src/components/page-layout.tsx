import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { CONTENT_WIDTH } from "@/components/top-nav";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageLayout({
  children,
  title,
  description,
  breadcrumbs,
  actions,
}: PageLayoutProps) {
  // Only show a trail when there is somewhere to go back to
  const trail = breadcrumbs && breadcrumbs.length > 1 ? breadcrumbs.slice(0, -1) : [];

  return (
    <div className={cn(CONTENT_WIDTH, "pb-24 pt-12")}>
      <header className="mb-10 flex items-end justify-between gap-6">
        <div className="min-w-0 space-y-2">
          {trail.length > 0 && (
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {trail.map((item, index) => (
                <Fragment key={index}>
                  {index > 0 && <span>/</span>}
                  {item.href ? (
                    <Link to={item.href} className="hover:text-foreground">
                      {item.label}
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </Fragment>
              ))}
            </nav>
          )}
          <h1 className="truncate text-[28px] leading-tight">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>

      <main>{children}</main>
    </div>
  );
}

// Empty state component for consistent empty states across pages
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-20 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <h3 className="mt-4 text-base">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Stat card for dashboard metrics
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "vibrant";
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
}: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-lg ${
        variant === "vibrant"
          ? "bg-gradient-to-br from-vibrant/10 via-vibrant/5 to-transparent border-vibrant/20 hover:border-vibrant/40 hover:shadow-vibrant/10"
          : "bg-card border-border/60 hover:border-border"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold tracking-tight ${variant === "vibrant" ? "text-gradient-vibrant" : ""}`}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={`text-xs font-medium ${
                trend.value >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              variant === "vibrant"
                ? "bg-gradient-vibrant text-white shadow-lg shadow-vibrant/25"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
