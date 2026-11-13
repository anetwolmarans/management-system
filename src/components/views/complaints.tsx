"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, MessageSquareWarning, Filter, Search, Eye, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Complaint {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  employee?: { id: string; name: string; department: string };
}

interface Employee { id: string; name: string; }

const CATEGORIES = ["harassment", "safety", "payment", "workload", "equipment", "other"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "investigating", "resolved", "dismissed"];

export function ComplaintsView() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState("");
  const [form, setForm] = useState<{ employeeId: string; title: string; description: string; category: string; priority: string }>({
    employeeId: "", title: "", description: "", category: "other", priority: "medium",
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (priority !== "all") params.set("priority", priority);
    if (category !== "all") params.set("category", category);
    fetch(`/api/complaints?${params}`)
      .then((r) => r.json())
      .then((data: Complaint[]) => {
        const filtered = query
          ? data.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()))
          : data;
        setComplaints(filtered);
      })
      .catch(() => toast.error("Failed to load complaints"))
      .finally(() => setLoading(false));
  }, [status, priority, category, query]);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const updateStatus = async (id: string, newStatus: string) => {
    const body: Record<string, unknown> = { status: newStatus };
    if (newStatus === "resolved" && resolution) body.resolution = resolution;
    const r = await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      toast.success(`Complaint marked ${newStatus}`);
      setViewing(null);
      setResolution("");
      load();
    } else toast.error("Update failed");
  };

  const save = async () => {
    if (!form.employeeId || !form.title) { toast.error("Employee and title are required"); return; }
    const r = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("Complaint filed");
      setDialogOpen(false);
      setForm({ employeeId: "", title: "", description: "", category: "other", priority: "medium" });
      load();
    } else toast.error("Save failed");
  };

  const counts = {
    open: complaints.filter((c) => c.status === "open" || c.status === "investigating").length,
    critical: complaints.filter((c) => c.priority === "critical").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Complaints & Cases"
        description="Track workplace complaints from filing to resolution."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> File complaint
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active cases</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{counts.open}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Critical priority</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">{counts.critical}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Resolved</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{counts.resolved}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title or description…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : complaints.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState title="No complaints match" description="Adjust filters or file a new complaint." /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {complaints.map((c) => (
            <Card key={c.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground capitalize">{c.category}</span>
                  <div className="flex gap-1">
                    <StatusBadge status={c.priority} />
                  </div>
                </div>
                <h3 className="font-medium mt-2 line-clamp-2">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 flex-1">{c.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{c.employee?.name ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewing(c)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New complaint dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>File a complaint</DialogTitle>
            <DialogDescription>Submit a workplace complaint or concern</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief headline" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Full details of the complaint" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>File complaint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / resolve dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              Filed by {viewing?.employee?.name ?? "Unknown"} on{" "}
              {viewing && new Date(viewing.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={viewing.priority} />
                <StatusBadge status={viewing.status} />
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">{viewing.category}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{viewing.description}</p>
              </div>
              {viewing.resolution && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{viewing.resolution}</p>
                </div>
              )}
              {viewing.status !== "resolved" && viewing.status !== "dismissed" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Resolution notes (required to resolve)</Label>
                    <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Document the corrective action taken…" rows={3} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateStatus(viewing.id, "investigating")}>Mark investigating</Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                      if (!resolution) { toast.error("Add resolution notes first"); return; }
                      updateStatus(viewing.id, "resolved");
                    }}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600 ml-auto" onClick={() => updateStatus(viewing.id, "dismissed")}>Dismiss</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
