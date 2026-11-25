"use client";

import { useEffect, useState } from "react";
import { SectionHeader, StatusBadge } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle2, ThumbsUp, MessageSquareWarning,
  ClipboardList, Truck, CalendarClock, Wrench, Activity,
} from "lucide-react";

interface OverviewData {
  complaints: any[];
  compliments: any[];
  complaintStats: { open: number; investigating: number; resolved: number; total: number };
  complimentStats: { total: number; thisWeek: number };
  inspections: any[];
  inspectionStats: { total: number; flagged: number; fail: number; warning: number };
  fleetStats: { total: number; active: number; maintenance: number; retired: number };
  scheduledJobs: { type: string; date: string; title: string; vehicle: string | null }[];
  overdueServices: any[];
}

export function OperationsOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/operations/overview")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading operations overview…</div>;
  }
  if (!data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Could not load overview.</div>;
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Operations Overview"
        description="Owner dashboard — jobs, feedback, inspections and fleet at a glance."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          icon={CalendarClock}
          label="Jobs scheduled"
          value={data.scheduledJobs.length}
          hint="Next 7 days"
          accent="cyan"
        />
        <KpiTile
          icon={MessageSquareWarning}
          label="Open complaints"
          value={data.complaintStats.open}
          hint={`${data.complaintStats.total} total`}
          accent={data.complaintStats.open > 0 ? "rose" : "emerald"}
        />
        <KpiTile
          icon={ThumbsUp}
          label="Compliments"
          value={data.complimentStats.total}
          hint={`${data.complimentStats.thisWeek} this week`}
          accent="emerald"
        />
        <KpiTile
          icon={AlertTriangle}
          label="Flagged inspections"
          value={data.inspectionStats.flagged}
          hint={`${data.inspectionStats.fail} failed · ${data.inspectionStats.warning} warnings`}
          accent={data.inspectionStats.flagged > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Two-column: complaints + compliments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Complaints */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-rose-500" /> Complaints
              </h3>
              <Badge variant="secondary">
                {data.complaintStats.open} open · {data.complaintStats.resolved} resolved
              </Badge>
            </div>
            {data.complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No complaints on record.</p>
            ) : (
              data.complaints.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.employee?.name ?? "—"} · {c.category} · {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Compliments */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-emerald-500" /> Compliments
              </h3>
              <Badge variant="secondary">{data.complimentStats.total} total</Badge>
            </div>
            {data.compliments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No compliments yet.</p>
            ) : (
              data.compliments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.employee?.name ?? "—"} · {c.category} · {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-column: scheduled jobs + inspections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scheduled jobs */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" /> Jobs Scheduled (next 7 days)
            </h3>
            {data.scheduledJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled this week.</p>
            ) : (
              data.scheduledJobs.map((job, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.vehicle ? `${job.vehicle} · ` : ""}{fmtDate(job.date)}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{job.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent inspections */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Recent Inspections
            </h3>
            {data.inspections.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No inspections logged.</p>
            ) : (
              data.inspections.map((insp) => (
                <div key={insp.id} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {insp.vehicle ? `${insp.vehicle.brand} ${insp.vehicle.model}` : "—"}
                      <span className="text-xs text-muted-foreground ml-1">{insp.vehicle?.plateNumber}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insp.inspector?.name ?? "—"} · {fmtDate(insp.date)}
                      {insp.flagged && <span className="text-rose-500 font-medium ml-1">· FLAGGED</span>}
                    </p>
                  </div>
                  <StatusBadge status={insp.overallStatus} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fleet summary + overdue services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fleet summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Fleet Summary
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <FleetStat label="Total" value={data.fleetStats.total} />
              <FleetStat label="Active" value={data.fleetStats.active} color="text-emerald-600" />
              <FleetStat label="Maintenance" value={data.fleetStats.maintenance} color="text-amber-600" />
              <FleetStat label="Retired" value={data.fleetStats.retired} color="text-muted-foreground" />
            </div>
            {data.overdueServices.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mb-2">
                  <Wrench className="h-3 w-3" /> Overdue services ({data.overdueServices.length})
                </p>
                {data.overdueServices.slice(0, 3).map((s) => (
                  <p key={s.id} className="text-xs text-muted-foreground truncate">
                    {s.vehicle ? `${s.vehicle.plateNumber} — ` : ""}{s.description ?? s.serviceType ?? "Service"} · was due {fmtDate(s.date)}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> This Week at a Glance
            </h3>
            <div className="space-y-2 text-sm">
              <SummaryRow icon={CalendarClock} label="Scheduled jobs" value={data.scheduledJobs.length} />
              <SummaryRow icon={MessageSquareWarning} label="Open complaints" value={data.complaintStats.open} />
              <SummaryRow icon={ThumbsUp} label="Compliments received" value={data.complimentStats.total} />
              <SummaryRow icon={ClipboardList} label="Inspections logged" value={data.inspectionStats.total} />
              <SummaryRow icon={AlertTriangle} label="Flagged inspections" value={data.inspectionStats.flagged} highlight={data.inspectionStats.flagged > 0} />
              <SummaryRow icon={Wrench} label="Overdue services" value={data.overdueServices.length} highlight={data.overdueServices.length > 0} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, hint, accent }: {
  icon: any; label: string; value: number | string; hint: string; accent: string;
}) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-600 bg-cyan-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
  };
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[accent] ?? colors.cyan}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FleetStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, highlight }: {
  icon: any; label: string; value: number; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className={`font-bold ${highlight ? "text-rose-600" : ""}`}>{value}</span>
    </div>
  );
}
