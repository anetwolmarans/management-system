"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Plus, Check, X, CalendarRange } from "lucide-react";
import { toast } from "sonner";

interface Leave {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  employee?: { id: string; name: string; department: string; position: string };
}

interface Employee { id: string; name: string; }

const LEAVE_TYPES = ["annual", "sick", "unpaid", "emergency", "maternity"];

export function LeaveView() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ employeeId: string; type: string; startDate: string; endDate: string; reason: string }>({
    employeeId: "",
    type: "annual",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    fetch(`/api/leave?${params}`)
      .then((r) => r.json())
      .then(setLeaves)
      .catch(() => toast.error("Failed to load leave"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const stats = {
    pending: leaves.filter((l) => l.status === "pending").length,
    approved: leaves.filter((l) => l.status === "approved").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
    daysRequested: leaves.reduce((s, l) => s + l.days, 0),
  };

  const decide = async (id: string, status: string) => {
    const r = await fetch(`/api/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewedBy: "Sarah Chen" }),
    });
    if (r.ok) {
      toast.success(`Leave ${status}`);
      load();
    } else toast.error("Update failed");
  };

  const save = async () => {
    if (!form.employeeId) { toast.error("Select an employee"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date must be after start date");
      return;
    }
    const r = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("Leave request submitted");
      setDialogOpen(false);
      load();
    } else toast.error("Submit failed");
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Leave Management"
        description="Submit, review and approve leave requests across the team."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New request
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{stats.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.approved}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Rejected</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">{stats.rejected}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total days requested</p>
          <p className="text-2xl font-bold mt-1">{stats.daysRequested}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : leaves.length === 0 ? (
            <EmptyState title="No leave requests" description="Submit one with the New Request button." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{l.employee?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{l.employee?.department}</p>
                        </TableCell>
                        <TableCell className="capitalize text-sm">{l.type}</TableCell>
                        <TableCell className="text-sm">{new Date(l.startDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{new Date(l.endDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm font-medium">{l.days}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{l.reason}</TableCell>
                        <TableCell><StatusBadge status={l.status} /></TableCell>
                        <TableCell className="text-right">
                          {l.status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => decide(l.id, "approved")}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => decide(l.id, "rejected")}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden divide-y">
                {leaves.map((l) => (
                  <div key={l.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{l.employee?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{l.type} leave · {l.days} day{l.days > 1 ? "s" : ""}</p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <CalendarRange className="h-3 w-3" />
                      {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                    </p>
                    {l.reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.reason}</p>}
                    {l.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => decide(l.id, "approved")}>
                          <Check className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-rose-600" onClick={() => decide(l.id, "rejected")}>
                          <X className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New leave request</DialogTitle>
            <DialogDescription>Submit a leave request on behalf of an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leave type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Brief reason for the leave" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Submit request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
