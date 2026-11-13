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
  accent?: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
  children?: ReactNode;
}

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

export function KpiCard({ label, value, hint, icon: Icon, accent = "slate", children }: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight mt-1 truncate">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", accentMap[accent])}>
            <Icon className="h-4 w-4" />
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
        <h2 className="text-xl font-semibold tracking-tight truncate">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    open: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    investigating: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    "in progress": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dismissed: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    blocked: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    "on-leave": "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    suspended: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    terminated: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    maintenance: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    retired: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    "not started": "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    defaulted: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    critical: "bg-rose-600/15 text-rose-700 dark:text-rose-300 font-semibold",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  };
  const cls = map[status.toLowerCase()] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-300";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", cls)}>
      {status.replace("-", " ")}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <p className="text-base font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
