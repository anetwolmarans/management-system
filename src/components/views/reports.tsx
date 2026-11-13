"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileBarChart, Plus, Download, Trash2, Users, Clock, Truck, AlertTriangle, CalendarDays, Banknote } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  weekStart: string;
  weekEnd: string;
  title: string;
  summary: string;
  totalEmployees: number;
  totalHours: number;
  complaintsOpen: number;
  complaintsResolved: number;
  leaveDays: number;
  fleetTrips: number;
  fleetDistance: number;
  loansActive: number;
  authoredBy?: { name: string } | null;
}

export function ReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customSummary, setCustomSummary] = useState("");
  const [customWeekStart, setCustomWeekStart] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setReports)
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const generate = async () => {
    const body: Record<string, unknown> = {};
    if (customTitle) body.title = customTitle;
    if (customSummary) body.summary = customSummary;
    if (customWeekStart) body.weekStart = customWeekStart;
    const r = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      toast.success("Weekly report generated");
      setDialogOpen(false);
      setCustomTitle("");
      setCustomSummary("");
      setCustomWeekStart("");
      load();
    } else toast.error("Generate failed");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    const r = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Report deleted");
      load();
    } else toast.error("Delete failed");
  };

  const exportReport = (r: Report) => {
    const lines = [
      `WORKHUB — WEEKLY OPERATIONS REPORT`,
      `==================================`,
      ``,
      `Title: ${r.title}`,
      `Period: ${new Date(r.weekStart).toLocaleDateString()} → ${new Date(r.weekEnd).toLocaleDateString()}`,
      `Author: ${r.authoredBy?.name ?? "System generated"}`,
      ``,
      `SUMMARY`,
      `-------`,
      r.summary,
      ``,
      `KEY METRICS`,
      `-----------`,
      `Total employees:        ${r.totalEmployees}`,
      `Total productive hours: ${r.totalHours}`,
      `Leave days taken:       ${r.leaveDays}`,
      `Complaints open:        ${r.complaintsOpen}`,
      `Complaints resolved:    ${r.complaintsResolved}`,
      `Fleet trips:            ${r.fleetTrips}`,
      `Fleet distance:         ${r.fleetDistance.toLocaleString()} km`,
      `Active loans:           ${r.loansActive}`,
      ``,
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workhub-report-${new Date(r.weekStart).toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Weekly Reports"
        description="Auto-generated operational summaries you can review and export."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Generate report
          </Button>
        }
      />

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : reports.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState title="No reports yet" description="Generate a report to summarise the week." action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Generate report</Button>} /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base truncate">{r.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.weekStart).toLocaleDateString()} → {new Date(r.weekEnd).toLocaleDateString()} · by {r.authoredBy?.name ?? "System"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.summary}</p>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                      <Metric icon={Users} label="Staff" value={r.totalEmployees} color="text-cyan-600" />
                      <Metric icon={Clock} label="Hours" value={r.totalHours} color="text-emerald-600" />
                      <Metric icon={CalendarDays} label="Leave days" value={r.leaveDays} color="text-violet-600" />
                      <Metric icon={AlertTriangle} label="Open cases" value={r.complaintsOpen} color="text-rose-600" />
                      <Metric icon={Truck} label="Trips" value={r.fleetTrips} color="text-amber-600" />
                      <Metric icon={Banknote} label="Active loans" value={r.loansActive} color="text-slate-600" />
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                      <FileBarChart className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportReport(r)}>
                      <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate weekly report</DialogTitle>
            <DialogDescription>Auto-aggregates data from the past week (or a chosen week)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Week start (optional)</Label>
              <Input type="date" value={customWeekStart} onChange={(e) => setCustomWeekStart(e.target.value)} placeholder="Defaults to last Monday" />
            </div>
            <div className="space-y-1.5">
              <Label>Custom title (optional)</Label>
              <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Auto-generated if blank" />
            </div>
            <div className="space-y-1.5">
              <Label>Custom summary (optional)</Label>
              <Textarea value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} placeholder="Auto-generated from data if blank" rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">
              The report will pull real numbers from timesheets, leave, complaints, fleet and loans.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={generate}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              {viewing && `${new Date(viewing.weekStart).toLocaleDateString()} → ${new Date(viewing.weekEnd).toLocaleDateString()} · by ${viewing.authoredBy?.name ?? "System"}`}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Executive summary</p>
                <p className="text-sm leading-relaxed">{viewing.summary}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Metric icon={Users} label="Total employees" value={viewing.totalEmployees} color="text-cyan-600" />
                <Metric icon={Clock} label="Productive hours" value={viewing.totalHours} color="text-emerald-600" />
                <Metric icon={CalendarDays} label="Leave days" value={viewing.leaveDays} color="text-violet-600" />
                <Metric icon={AlertTriangle} label="Complaints open" value={viewing.complaintsOpen} color="text-rose-600" />
                <Metric icon={AlertTriangle} label="Complaints resolved" value={viewing.complaintsResolved} color="text-emerald-600" />
                <Metric icon={Truck} label="Fleet trips" value={viewing.fleetTrips} color="text-amber-600" />
                <Metric icon={Truck} label="Fleet distance" value={`${viewing.fleetDistance.toLocaleString()} km`} color="text-amber-600" />
                <Metric icon={Banknote} label="Active loans" value={viewing.loansActive} color="text-slate-600" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => exportReport(viewing)}>
                  <Download className="h-4 w-4 mr-1" /> Export as text
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Icon className={`h-4 w-4 ${color}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
