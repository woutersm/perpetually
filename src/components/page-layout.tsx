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
  /** Sub-navigation rendered under the title, e.g. settings tabs */
  tabs?: React.ReactNode;
}

export function PageLayout({
  children,
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
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

      {tabs}
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
