import { Fragment } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  return (
    <SidebarInset>
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex flex-1 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {item.href ? (
                        <BreadcrumbLink href={item.href}>
                          {item.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
      </header>

      {/* Page Content */}
      <div className="flex flex-1 flex-col">
        {/* Page Header */}
        <div className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent relative overflow-hidden">
          {/* Subtle gradient orb */}
          <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-vibrant/5 rounded-full blur-[80px] opacity-50" />

          <div className="relative px-6 py-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {description && (
                  <p className="text-muted-foreground max-w-2xl">
                    {description}
                  </p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </SidebarInset>
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
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/20 px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="mt-6 text-lg font-semibold">{title}</h3>
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
