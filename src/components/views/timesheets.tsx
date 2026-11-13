"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Plus, CheckCircle2, XCircle, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Timesheet {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  breakMin: number;
  status: string;
  notes: string | null;
  employee?: { id: string; name: string; employeeNo: string; department: string };
}

interface Employee {
  id: string; name: string; employeeNo: string; department: string;
}

export function TimesheetsView() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ employeeId: string; date: string; clockIn: string; clockOut: string; breakMin: number; notes: string }>({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    clockIn: "09:00",
    clockOut: "17:30",
    breakMin: 30,
    notes: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterEmp !== "all") params.set("employeeId", filterEmp);
    fetch(`/api/timesheets?${params}`)
      .then((r) => r.json())
      .then((t) => {
        const filtered = filterStatus === "all" ? t : t.filter((x: Timesheet) => x.status === filterStatus);
        setTimesheets(filtered);
      })
      .catch(() => toast.error("Failed to load timesheets"))
      .finally(() => setLoading(false));
  }, [filterEmp, filterStatus]);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const totalHours = timesheets.reduce((s, t) => s + t.hours, 0);
  const pendingCount = timesheets.filter((t) => t.status === "pending").length;
  const approvedCount = timesheets.filter((t) => t.status === "approved").length;

  const setStatus = async (id: string, status: string) => {
    const r = await fetch(`/api/timesheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      toast.success(`Timesheet ${status}`);
      load();
    } else {
      toast.error("Update failed");
    }
  };

  const clockAction = async (employeeId: string, action: "in" | "out") => {
    if (!employeeId) {
      toast.error("Select an employee first");
      return;
    }
    const now = new Date().toISOString();
    if (action === "in") {
      const r = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, clockIn: now, status: "pending" }),
      });
      if (r.ok) {
        toast.success("Clocked in");
        load();
      } else toast.error("Clock-in failed");
    } else {
      // Find today's open timesheet for this employee
      const empTs = timesheets.find((t) => t.employeeId === employeeId && !t.clockOut);
      if (!empTs) {
        toast.error("No open clock-in session found for this employee today");
        return;
      }
      const r = await fetch(`/api/timesheets/${empTs.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clockOut: now }),
      });
      if (r.ok) {
        toast.success("Clocked out");
        load();
      } else toast.error("Clock-out failed");
    }
  };

  const save = async () => {
    if (!form.employeeId) { toast.error("Select an employee"); return; }
    const dateStr = form.date;
    const clockInISO = new Date(`${dateStr}T${form.clockIn}:00`).toISOString();
    const clockOutISO = form.clockOut ? new Date(`${dateStr}T${form.clockOut}:00`).toISOString() : null;
    const r = await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId,
        date: dateStr,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        breakMin: form.breakMin,
        notes: form.notes || null,
        status: "pending",
      }),
    });
    if (r.ok) {
      toast.success("Timesheet entry added");
      setDialogOpen(false);
      load();
    } else {
      toast.error("Save failed");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Timesheets"
        description="Clock in/out, hours worked, and approval workflow."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Manual entry
          </Button>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total entries</p>
          <p className="text-2xl font-bold mt-1">{timesheets.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total hours</p>
          <p className="text-2xl font-bold mt-1">{totalHours.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending approval</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">{approvedCount} approved</p>
        </CardContent></Card>
      </div>

      {/* Quick clock-in/out */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Quick Clock In / Out
          </CardTitle>
          <CardDescription>Pick an employee and stamp their time</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} — {e.employeeNo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => clockAction(form.employeeId, "in")} className="sm:w-36">
            <LogIn className="h-4 w-4 mr-1" /> Clock In
          </Button>
          <Button variant="outline" onClick={() => clockAction(form.employeeId, "out")} className="sm:w-36">
            <LogOut className="h-4 w-4 mr-1" /> Clock Out
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Employee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
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
          ) : timesheets.length === 0 ? (
            <EmptyState title="No timesheet entries" description="Add one manually or use quick clock-in." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheets.slice(0, 100).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{t.employee?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{t.employee?.department}</p>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{new Date(t.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                        <TableCell className="text-sm">{t.clockOut ? new Date(t.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                        <TableCell className="text-sm">{t.breakMin}m</TableCell>
                        <TableCell className="font-medium">{t.hours.toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell className="text-right">
                          {t.status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => setStatus(t.id, "approved")}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => setStatus(t.id, "rejected")}>
                                <XCircle className="h-3.5 w-3.5" />
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
                {timesheets.slice(0, 50).map((t) => (
                  <div key={t.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{t.employee?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{t.hours.toFixed(2)}h</p>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>In: {new Date(t.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>Out: {t.clockOut ? new Date(t.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                      <span>Break: {t.breakMin}m</span>
                    </div>
                    {t.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => setStatus(t.id, "approved")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-rose-600" onClick={() => setStatus(t.id, "rejected")}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
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
            <DialogTitle>Manual timesheet entry</DialogTitle>
            <DialogDescription>Add a historical entry or back-fill hours</DialogDescription>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Break (min)</Label>
                <Input type="number" value={form.breakMin} onChange={(e) => setForm({ ...form, breakMin: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Clock in</Label>
                <Input type="time" value={form.clockIn} onChange={(e) => setForm({ ...form, clockIn: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Clock out</Label>
                <Input type="time" value={form.clockOut} onChange={(e) => setForm({ ...form, clockOut: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
