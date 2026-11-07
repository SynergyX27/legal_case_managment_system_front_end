import { Layers2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  Active: "bg-info/10 text-info border-info/20",
  Pending: "bg-warning/15 text-foreground border-warning/30",
  Scheduled: "bg-accent text-accent-foreground border-primary/10",
  Completed: "bg-success/10 text-success border-success/20",
  Cancelled: "bg-muted text-muted-foreground border-border",
  Paid: "bg-success/10 text-success border-success/20",
  Sent: "bg-info/10 text-info border-info/20",
  Draft: "bg-muted text-muted-foreground border-border",
  Overdue: "bg-destructive/10 text-destructive border-destructive/20",
  "Not Invoiced": "bg-muted text-muted-foreground border-border",
  Low: "bg-muted text-muted-foreground border-border",
  Medium: "bg-info/10 text-info border-info/20",
  High: "bg-warning/15 text-foreground border-warning/30",
  Urgent: "bg-destructive/10 text-destructive border-destructive/20",
  Inactive: "bg-muted text-muted-foreground border-border",
  "On Hold": "bg-warning/15 text-foreground border-warning/30",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        tone[value] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {["Active", "Overdue", "Urgent"].includes(value) && (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {value}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.035em] text-foreground md:text-[32px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card shadow-[0_1px_2px_0_oklch(0.3_0.08_262/0.05)]",
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground ring-1 ring-primary/5",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Logo({ light, compact }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm",
          light && "bg-white/15",
        )}
      >
        <Layers2 className="size-5" />
      </span>
      {!compact && (
        <span
          className={cn(
            "font-display text-[21px] font-bold tracking-[-0.045em]",
            light ? "text-white" : "text-foreground",
          )}
        >
          LegalFlow<span className="ml-0.5 text-primary">.</span>
        </span>
      )}
    </span>
  );
}
