"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState, KpiCard } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Factory, Plus, Search, Eye, Pencil, Trash2, Download, ChevronDown, ChevronRight,
  AlertTriangle, ClipboardList, Users, Wrench, Package, FileText, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type ItemCategory = "cleaning-findings" | "machinery" | "personnel" | "ppe-equipment" | "other";
type ItemStatus = "open" | "in-progress" | "resolved";

interface ReportItem {
  id: string;
  category: ItemCategory;
  description: string;
  actionNeeded: string;
  responsiblePerson: string;
  status: ItemStatus;
}
interface ReportSection {
  id: string;
  siteName: string;
  reporterName: string;
  summary: string;
  items: ReportItem[];
}
interface FactoryReport {
  id: string;
  title: string;
  reportDate: string;
  company: string;
  frequency: string;
  compiledBy: string;
  compiledFor: string | null;
  sections: ReportSection[];
  status: string;
  notes: string | null;
  createdAt: string;
  // computed by GET list endpoint
  siteCount?: number;
  itemCount?: number;
  openItems?: number;
  resolvedItems?: number;
}

const CATEGORIES: { value: ItemCategory; label: string; icon: typeof Wrench; color: string }[] = [
  { value: "cleaning-findings", label: "Cleaning Findings", icon: ClipboardList, color: "text-cyan-700 dark:text-cyan-300" },
  { value: "machinery", label: "Machinery", icon: Wrench, color: "text-amber-700 dark:text-amber-300" },
  { value: "personnel", label: "Personnel", icon: Users, color: "text-violet-700 dark:text-violet-300" },
  { value: "ppe-equipment", label: "PPE / Equipment", icon: Package, color: "text-teal-700 dark:text-teal-300" },
  { value: "other", label: "Other", icon: FileText, color: "text-slate-700 dark:text-slate-300" },
];

const STATUSES: ItemStatus[] = ["open", "in-progress", "resolved"];

const categoryMeta = (cat: string) => CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Generate a unique-ish id
const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ============================================================
// Main FactoryReportsView
// ============================================================
export function FactoryReportsView() {
  const [reports, setReports] = useState<FactoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState<FactoryReport | null>(null);
  const [editing, setEditing] = useState<FactoryReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/factory-reports")
      .then((r) => r.json())
      .then(setReports)
      .catch(() => toast.error("Failed to load factory reports"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  // Filter
  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.compiledBy.toLowerCase().includes(q) ||
        r.sections.some((s) => s.siteName.toLowerCase().includes(q) || s.items.some((i) => i.description.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  // KPIs
  const totalReports = reports.length;
  const totalSites = reports.reduce((s, r) => s + (r.siteCount ?? r.sections.length), 0);
  const totalOpenItems = reports.reduce((s, r) => s + (r.openItems ?? r.sections.flatMap((sec) => sec.items).filter((i) => i.status === "open").length), 0);
  const totalItems = reports.reduce((s, r) => s + (r.itemCount ?? r.sections.flatMap((sec) => sec.items).length), 0);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (r: FactoryReport) => {
    setEditing(r);
    setDialogOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this factory report?")) return;
    const r = await fetch(`/api/factory-reports/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Report deleted");
      load();
    } else toast.error("Delete failed");
  };

  const exportReport = (r: FactoryReport) => {
    const lines: string[] = [];
    lines.push("DAILY FACTORY REPORT");
    lines.push(r.company);
    lines.push("=".repeat(60));
    lines.push(`Title: ${r.title}`);
    lines.push(`Date: ${fmtDate(r.reportDate)}`);
    lines.push(`Frequency: ${r.frequency}`);
    lines.push(`Compiled by: ${r.compiledBy}`);
    if (r.compiledFor) lines.push(`Compiled for: ${r.compiledFor}`);
    lines.push(`Status: ${r.status}`);
    lines.push("");
    for (const s of r.sections) {
      lines.push(`${s.siteName} — ${fmtDate(r.reportDate)}`);
      lines.push("-".repeat(60));
      if (s.summary) {
        lines.push(s.summary);
        lines.push("");
      }
      // Group items by category
      for (const cat of CATEGORIES) {
        const items = s.items.filter((i) => i.category === cat.value);
        if (items.length === 0) continue;
        const idx = CATEGORIES.findIndex((c) => c.value === cat.value) + 1;
        lines.push(`${idx}. ${cat.label.toUpperCase()}`);
        for (const it of items) {
          lines.push(`  • ${it.description}`);
          if (it.actionNeeded) lines.push(`    Action: ${it.actionNeeded}`);
          if (it.responsiblePerson) lines.push(`    Responsible: ${it.responsiblePerson}`);
          lines.push(`    Status: ${it.status}`);
        }
        lines.push("");
      }
      if (s.reporterName) {
        lines.push("REPORTING");
        lines.push(s.reporterName);
        lines.push("");
      }
      lines.push("");
    }
    if (r.notes) {
      lines.push("NOTES");
      lines.push("-".repeat(60));
      lines.push(r.notes);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factory-report-${new Date(r.reportDate).toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Daily Factory Reports"
        description="Multi-site operational reports — compiled daily with categorized action items."
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> New report
          </Button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Reports" value={totalReports} hint="All time" icon={Factory} accent="teal" />
        <KpiCard label="Sites covered" value={totalSites} hint="Across all reports" icon={MapPin} accent="cyan" />
        <KpiCard label="Total line items" value={totalItems} hint="Cleaning, machinery, personnel…" icon={ClipboardList} accent="violet" />
        <KpiCard label="Open items" value={totalOpenItems} hint="Awaiting action" icon={AlertTriangle} accent={totalOpenItems > 0 ? "rose" : "emerald"} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title, site, description…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports list */}
      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState title="No reports match" description="Adjust filters or create a new factory report." icon={Factory} action={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> New report</Button>} /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const sites = r.sections ?? [];
            const openItems = r.openItems ?? sites.flatMap((s) => s.items).filter((i) => i.status === "open").length;
            const inProgressItems = sites.flatMap((s) => s.items).filter((i) => i.status === "in-progress").length;
            const resolvedItems = r.resolvedItems ?? sites.flatMap((s) => s.items).filter((i) => i.status === "resolved").length;
            return (
              <Card key={r.id} className="card-hover">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{r.title}</h3>
                        <StatusBadge status={r.status} />
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{r.frequency}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.company} · {fmtDate(r.reportDate)} · Compiled by {r.compiledBy}{r.compiledFor ? ` for ${r.compiledFor}` : ""}
                      </p>

                      {/* Site chips */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {sites.slice(0, 8).map((s) => (
                          <span key={s.id} className="text-[11px] px-2 py-0.5 rounded-md bg-muted font-medium">
                            {s.siteName}
                          </span>
                        ))}
                        {sites.length > 8 && <span className="text-[11px] px-2 py-0.5 text-muted-foreground">+{sites.length - 8} more</span>}
                      </div>

                      {/* Item stats */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
                        <span className="text-muted-foreground">{sites.length} site{sites.length !== 1 ? "s" : ""}</span>
                        <span className="text-rose-700 dark:text-rose-300 font-medium">{openItems} open</span>
                        <span className="text-amber-700 dark:text-amber-300 font-medium">{inProgressItems} in progress</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">{resolvedItems} resolved</span>
                      </div>

                      {r.notes && <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">{r.notes}</p>}
                    </div>

                    <div className="flex md:flex-col gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportReport(r)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> Export
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      <ReportDetailDrawer report={viewing} open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} onEdit={(r) => { setViewing(null); openEdit(r); }} onExport={exportReport} />

      {/* Create/edit dialog */}
      <ReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
    </div>
  );
}

// ============================================================
// Report Detail Drawer — read-only view with categorized items
// ============================================================
function ReportDetailDrawer({
  report, open, onOpenChange, onEdit, onExport,
}: {
  report: FactoryReport | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (r: FactoryReport) => void;
  onExport: (r: FactoryReport) => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (report) {
      // Expand all sections by default when opening
      Promise.resolve().then(() => setExpandedSections(new Set(report.sections.map((s) => s.id))));
    }
  }, [report]);

  if (!report) return null;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = report.sections.flatMap((s) => s.items).length;
  const openItems = report.sections.flatMap((s) => s.items).filter((i) => i.status === "open").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="px-5 py-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center justify-between gap-2">
            <span className="truncate">{report.title}</span>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onExport(report)}>
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(report)}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{report.company}</span>
            <span>·</span>
            <span>{fmtDate(report.reportDate)}</span>
            <span>·</span>
            <Badge variant="outline" className="text-[10px] uppercase">{report.frequency}</Badge>
            <StatusBadge status={report.status} />
            <span>·</span>
            <span>{report.sections.length} sites · {totalItems} items · {openItems} open</span>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Meta */}
          <Card>
            <CardContent className="p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Compiled by</span><span className="font-medium">{report.compiledBy}</span></div>
              {report.compiledFor && <div className="flex justify-between"><span className="text-muted-foreground">Compiled for</span><span className="font-medium">{report.compiledFor}</span></div>}
              {report.notes && (
                <div className="pt-2 mt-2 border-t border-border/60">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="text-foreground">{report.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sections */}
          {report.sections.map((section) => {
            const expanded = expandedSections.has(section.id);
            const secOpen = section.items.filter((i) => i.status === "open").length;
            const secInProgress = section.items.filter((i) => i.status === "in-progress").length;
            const secResolved = section.items.filter((i) => i.status === "resolved").length;
            return (
              <Card key={section.id}>
                <CardContent className="p-0">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <span className="font-semibold text-sm truncate">{section.siteName}</span>
                      <span className="text-[10px] text-muted-foreground">REPORTING: {section.reporterName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] shrink-0">
                      <span className="text-rose-700 dark:text-rose-300">{secOpen} open</span>
                      <span className="text-amber-700 dark:text-amber-300">{secInProgress} ip</span>
                      <span className="text-emerald-700 dark:text-emerald-300">{secResolved} done</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
                      {section.summary && (
                        <p className="text-xs text-muted-foreground italic">{section.summary}</p>
                      )}

                      {/* Items grouped by category */}
                      {CATEGORIES.map((cat) => {
                        const items = section.items.filter((i) => i.category === cat.value);
                        if (items.length === 0) return null;
                        const Icon = cat.icon;
                        const idx = CATEGORIES.findIndex((c) => c.value === cat.value) + 1;
                        return (
                          <div key={cat.value}>
                            <p className={cn("text-xs font-semibold uppercase tracking-wide flex items-center gap-1 mb-1.5", cat.color)}>
                              <Icon className="h-3 w-3" /> {idx}. {cat.label}
                            </p>
                            <div className="space-y-1.5">
                              {items.map((item) => (
                                <div key={item.id} className="text-xs p-2 rounded-md bg-muted/40 border border-border/40">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-sm leading-snug">{item.description}</p>
                                    <StatusBadge status={item.status} />
                                  </div>
                                  {item.actionNeeded && (
                                    <p className="text-muted-foreground mt-1">
                                      <span className="font-medium text-foreground">Action:</span> {item.actionNeeded}
                                    </p>
                                  )}
                                  {item.responsiblePerson && (
                                    <p className="text-muted-foreground mt-0.5">
                                      <span className="font-medium text-foreground">Responsible:</span> {item.responsiblePerson}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {section.items.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No items in this section</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Report Dialog — create/edit with dynamic sections and items
// ============================================================
function ReportDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: FactoryReport | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [company, setCompany] = useState("");
  const [frequency, setFrequency] = useState("DAILY");
  const [compiledBy, setCompiledBy] = useState("");
  const [compiledFor, setCompiledFor] = useState("");
  const [status, setStatus] = useState("submitted");
  const [notes, setNotes] = useState("");
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      if (editing) {
        setTitle(editing.title);
        setReportDate(new Date(editing.reportDate).toISOString().slice(0, 10));
        setCompany(editing.company);
        setFrequency(editing.frequency);
        setCompiledBy(editing.compiledBy);
        setCompiledFor(editing.compiledFor ?? "");
        setStatus(editing.status);
        setNotes(editing.notes ?? "");
        setSections(editing.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) })));
      } else {
        setTitle(`Daily Factory Report — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`);
        setReportDate(new Date().toISOString().slice(0, 10));
        setCompany("");
        setFrequency("DAILY");
        setCompiledBy("");
        setCompiledFor("OPERATIONS TEAM");
        setStatus("submitted");
        setNotes("");
        setSections([{ id: uid(), siteName: "", reporterName: "", summary: "", items: [] }]);
      }
    });
  }, [open, editing]);

  // Section operations
  const addSection = () => setSections([...sections, { id: uid(), siteName: "", reporterName: "", summary: "", items: [] }]);
  const updateSection = (id: string, patch: Partial<ReportSection>) => setSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection = (id: string) => setSections(sections.filter((s) => s.id !== id));
  const moveSection = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(idx, 1);
    next.splice(newIdx, 0, moved);
    setSections(next);
  };

  // Item operations
  const addItem = (sectionId: string) => setSections(sections.map((s) => s.id === sectionId ? { ...s, items: [...s.items, { id: uid(), category: "cleaning-findings", description: "", actionNeeded: "", responsiblePerson: "", status: "open" }] } : s));
  const updateItem = (sectionId: string, itemId: string, patch: Partial<ReportItem>) => setSections(sections.map((s) => s.id === sectionId ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : s));
  const removeItem = (sectionId: string, itemId: string) => setSections(sections.map((s) => s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s));

  const save = async () => {
    if (!title || !company || !reportDate) { toast.error("Title, company and date are required"); return; }
    // Filter out empty sections (no site name and no items)
    const cleanSections = sections
      .filter((s) => s.siteName.trim() || s.items.length > 0)
      .map((s) => ({ ...s, items: s.items.filter((i) => i.description.trim()) }));
    if (cleanSections.length === 0) { toast.error("Add at least one site section with items"); return; }

    const body = { title, reportDate, company, frequency, compiledBy, compiledFor: compiledFor || null, status, notes: notes || null, sections: cleanSections };
    const url = editing ? `/api/factory-reports/${editing.id}` : "/api/factory-reports";
    const method = editing ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      toast.success(editing ? "Report updated" : "Report created");
      onSaved();
    } else toast.error("Save failed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit factory report" : "New factory report"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update report metadata, sections and items" : "Multi-site daily report with categorized action items"}
          </DialogDescription>
        </DialogHeader>

        {/* Report metadata */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2"><Label>Report title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Company *</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="MANAGEMENT SYSTEM" /></div>
          <div className="space-y-1.5"><Label>Report date *</Label><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Frequency</Label><Select value={frequency} onValueChange={setFrequency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DAILY">Daily</SelectItem><SelectItem value="WEEKLY">Weekly</SelectItem><SelectItem value="MONTHLY">Monthly</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="reviewed">Reviewed</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Compiled by *</Label><Input value={compiledBy} onChange={(e) => setCompiledBy(e.target.value)} placeholder="FRANS AND COETZEE" /></div>
          <div className="space-y-1.5"><Label>Compiled for</Label><Input value={compiledFor} onChange={(e) => setCompiledFor(e.target.value)} placeholder="OPERATIONS TEAM" /></div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Executive summary, urgent flags, etc." />
        </div>

        {/* Sections */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site Sections ({sections.length})</p>
            <Button size="sm" variant="outline" onClick={addSection}><Plus className="h-3 w-3 mr-1" /> Add site</Button>
          </div>

          <div className="space-y-3">
            {sections.map((section, sIdx) => (
              <div key={section.id} className="border rounded-lg p-3 bg-muted/20">
                {/* Section header */}
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Site name</Label>
                    <Input value={section.siteName} onChange={(e) => updateSection(section.id, { siteName: e.target.value })} placeholder="HANGANA" className="h-8 text-sm font-semibold" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Reporter</Label>
                    <Input value={section.reporterName} onChange={(e) => updateSection(section.id, { reporterName: e.target.value })} placeholder="COETZEE" className="h-8 text-sm" />
                  </div>
                  <div className="flex items-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0} title="Move up">
                      <ChevronDown className="h-3 w-3 rotate-180" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => moveSection(sIdx, 1)} disabled={sIdx === sections.length - 1} title="Move down">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeSection(section.id)} title="Remove site">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 mb-2">
                  <Label className="text-[10px] uppercase">Summary</Label>
                  <Input value={section.summary} onChange={(e) => updateSection(section.id, { summary: e.target.value })} placeholder="Brief site summary" className="h-8 text-xs" />
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase">Action items ({section.items.length})</Label>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => addItem(section.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Item
                    </Button>
                  </div>
                  {section.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[120px_1fr_1fr_120px_120px_auto] gap-1.5 items-start p-1.5 rounded border border-border/50 bg-background">
                      <Select value={item.category} onValueChange={(v) => updateItem(section.id, item.id, { category: v as ItemCategory })}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })} className="h-7 text-[11px]" />
                      <Input placeholder="Action needed" value={item.actionNeeded} onChange={(e) => updateItem(section.id, item.id, { actionNeeded: e.target.value })} className="h-7 text-[11px]" />
                      <Input placeholder="Responsible" value={item.responsiblePerson} onChange={(e) => updateItem(section.id, item.id, { responsiblePerson: e.target.value })} className="h-7 text-[11px]" />
                      <Select value={item.status} onValueChange={(v) => updateItem(section.id, item.id, { status: v as ItemStatus })}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("-", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeItem(section.id, item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {section.items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">No items yet — click &quot;Item&quot; to add one</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save changes" : "Create report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
