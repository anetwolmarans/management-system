"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "teal" | "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate" | "orange";
  children?: ReactNode;
}

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  teal: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  orange: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

export function KpiCard({ label, value, hint, icon: Icon, accent = "slate", children }: KpiCardProps) {
  return (
    <Card className="overflow-hidden card-hover">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className="text-2xl md:text-[28px] font-bold tracking-tight mt-1.5 leading-none truncate">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-2 truncate">{hint}</p>}
          </div>
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", accentMap[accent])}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    // Active / positive
    active: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    approved: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    resolved: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    done: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    pass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    ok: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",

    // Pending / in-progress
    pending: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",
    investigating: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/20",
    "in progress": "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/20",
    warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",
    "due-soon": "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",
    maintenance: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",

    // Negative
    open: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    fail: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    rejected: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    dismissed: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    blocked: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    suspended: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    terminated: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    defaulted: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
    overdue: "bg-rose-600/15 text-rose-700 dark:text-rose-200 ring-1 ring-rose-500/30 font-semibold",

    // Neutral / info
    "on-leave": "bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/20",
    retired: "bg-slate-500/12 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20",
    "not started": "bg-slate-500/12 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20",

    // Priority levels
    critical: "bg-rose-600/20 text-rose-800 dark:text-rose-200 ring-1 ring-rose-500/40 font-semibold",
    high: "bg-orange-500/12 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20",
    medium: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",
    low: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
  };
  const cls = map[status.toLowerCase()] ?? "bg-slate-500/12 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap", cls)}>
      {status.replace("-", " ")}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/60 mb-2" />}
      <p className="text-base font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Compact stat row used inside cards (e.g. vehicle detail drawer)
export function StatRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium text-right", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
