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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Plus, Trash2, CheckCircle2, Ban, Search } from "lucide-react";
import { toast } from "sonner";

interface WarningRow {
  id: string;
  employeeId: string;
  type: string;
  subject: string;
  details: string;
  issuedBy: string;
  issuedAt: string;
  status: string;
  acknowledgedAt: string | null;
  employee: { id: string; name: string; employeeNo: string; department: string };
}

interface EmployeeOption {
  id: string;
  name: string;
  employeeNo: string;
  department: string;
}

const TYPES = [
  { value: "verbal", label: "Verbal" },
  { value: "written", label: "Written" },
  { value: "final", label: "Final" },
  { value: "performance", label: "Performance" },
  { value: "safety", label: "Safety" },
];

const TYPE_STYLES: Record<string, string> = {
  verbal: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  written: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  final: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  performance: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  safety: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

export function WarningsView() {
  const [warnings, setWarnings] = useState<WarningRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    type: "written",
    subject: "",
    details: "",
    issuedBy: "",
    issuedAt: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/warnings?${params}`)
      .then((r) => r.json())
      .then((rows) => setWarnings(Array.isArray(rows) ? rows : []))
      .catch(() => toast.error("Failed to load warnings"))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((rows) => setEmployees(Array.isArray(rows) ? rows.map((e: EmployeeOption) => ({ id: e.id, name: e.name, employeeNo: e.employeeNo, department: e.department })) : []))
      .catch(() => undefined);
  }, []);

  const filtered = warnings.filter((w) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      w.employee.name.toLowerCase().includes(q) ||
      w.employee.employeeNo.toLowerCase().includes(q) ||
      w.subject.toLowerCase().includes(q) ||
      w.details.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setForm({
      employeeId: "",
      type: "written",
      subject: "",
      details: "",
      issuedBy: "",
      issuedAt: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.employeeId) { toast.error("Select an employee"); return; }
    if (!form.subject.trim()) { toast.error("Subject is required"); return; }
    if (!form.details.trim()) { toast.error("Details are required"); return; }
    try {
      const r = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Save failed");
      toast.success("Warning issued");
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const r = await fetch(`/api/warnings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      toast.success(`Marked as ${status}`);
      load();
    } else {
      toast.error("Update failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this warning permanently?")) return;
    const r = await fetch(`/api/warnings/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Warning deleted");
      load();
    } else {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Warnings"
        description="Disciplinary and performance warnings issued to employees. Visible to each employee on their portal."
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Issue Warning
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee, subject or details…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active" className="capitalize">Active</SelectItem>
            <SelectItem value="acknowledged" className="capitalize">Acknowledged</SelectItem>
            <SelectItem value="expired" className="capitalize">Expired</SelectItem>
            <SelectItem value="withdrawn" className="capitalize">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No warnings"
              description="Issue a warning to track disciplinary or performance actions."
              action={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Issue Warning</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-medium">{w.employee.name}</div>
                        <div className="text-xs text-muted-foreground">{w.employee.employeeNo} · {w.employee.department}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TYPE_STYLES[w.type] ?? ""}`}>
                          {w.type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-medium truncate">{w.subject}</div>
                        <div className="text-xs text-muted-foreground truncate">{w.details}</div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(w.issuedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{w.issuedBy}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {w.status === "active" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Acknowledge" onClick={() => updateStatus(w.id, "acknowledged")}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {w.status !== "withdrawn" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Withdraw" onClick={() => updateStatus(w.id, "withdrawn")}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => remove(w.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Warning</DialogTitle>
            <DialogDescription>
              The employee will see this on their portal. Active warnings stay until acknowledged or withdrawn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.employeeNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Issue date</Label>
              <Input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Repeated lateness" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Details *</Label>
              <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={4} placeholder="Describe the incident, dates, prior discussions…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Issued by</Label>
              <Input value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} placeholder="Manager name (defaults to Management)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Issue warning</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
