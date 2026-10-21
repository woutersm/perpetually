/**
 * Layout building blocks for the paper theme. Pages compose these instead of
 * styling cards and tables by hand, so spacing and type stay consistent.
 */
import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** A titled block of a page: small caps label, optional actions, hairline */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-12 first:mt-0", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="label-caps">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 text-sm">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Plain numbers separated by vertical hairlines */
export function StatRow({
  items,
}: {
  items: { label: string; value: React.ReactNode; hint?: React.ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-2 border-y border-border md:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          // 2 columns on mobile, 4 from md: a left hairline wherever a cell has a neighbour
          className={cn("min-w-0 border-border px-4 py-5 sm:px-5 sm:py-6", i % 2 === 1 && "border-l", i === 2 && "md:border-l")}
        >
          <div className="label-caps">{item.label}</div>
          <div className="mt-2 text-2xl leading-none tabular-nums sm:text-[28px]">{item.value}</div>
          {item.hint && <div className="mt-2 text-xs text-muted-foreground">{item.hint}</div>}
        </div>
      ))}
    </div>
  );
}

export type Column<T> = {
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** CSS grid track, e.g. "minmax(0,2fr)" or "7rem" (default minmax(0,1fr)) */
  width?: string;
  className?: string;
};

/**
 * Hairline table. Rows become links when `href` is given.
 * Below md each row stacks: the first column takes the full width, the rest
 * sit in two columns with their header as a small label.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  href,
  empty = "Nothing here yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  empty?: React.ReactNode;
}) {
  // The column template only applies from md up, via the --cols variable
  const template = {
    "--cols": columns.map((c) => c.width ?? "minmax(0,1fr)").join(" "),
  } as React.CSSProperties;
  const rowClass =
    "group grid grid-cols-2 items-start gap-x-4 gap-y-3 border-b border-border px-3 py-3.5 text-sm md:grid-cols-(--cols) md:items-center md:gap-6";

  return (
    <div>
      <div className="label-caps hidden gap-6 px-3 pb-3 md:grid md:grid-cols-(--cols)" style={template}>
        {columns.map((c, i) => (
          <div key={i} className={c.className}>
            {c.header}
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        {rows.map((row) => {
          const cells = columns.map((c, i) => (
            <div key={i} className={cn("min-w-0", c.className, "max-md:text-left", i === 0 && "max-md:col-span-2")}>
              {i > 0 && c.header && <div className="label-caps mb-1 md:hidden">{c.header}</div>}
              {c.cell(row)}
            </div>
          ));
          return href ? (
            <Link
              key={rowKey(row)}
              to={href(row)}
              className={cn(rowClass, "transition-colors hover:bg-muted/60")}
              style={template}
            >
              {cells}
            </Link>
          ) : (
            <div key={rowKey(row)} className={rowClass} style={template}>
              {cells}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="border-b border-border px-3 py-10 text-center text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  );
}

/** Label/value pairs, label column on the left */
export function DefinitionList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-[7rem_minmax(0,1fr)] border-t border-border text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
      {items.map((item) => (
        <Fragment key={item.label}>
          <dt className="border-b border-border py-3 text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 border-b border-border py-3 wrap-anywhere">{item.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** White sheet with a hairline border, for forms and grouped content */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-md border border-border bg-card p-4 sm:p-6", className)}>{children}</div>;
}

/** Underlined tab row; used for filters and sub-navigation */
export function Tabs<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: React.ReactNode; count?: number }[];
}) {
  return (
    <div className="mb-6 overflow-x-auto [scrollbar-width:none]">
      <div className="flex w-max min-w-full gap-6 border-b border-border">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "-mb-px shrink-0 whitespace-nowrap border-b pb-3 text-sm transition-colors",
            value === o.value
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 tabular-nums text-muted-foreground">{o.count}</span>}
        </button>
      ))}
      </div>
    </div>
  );
}

/** Mono text with an optional muted second line */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[13px]", className)}>{children}</span>;
}
