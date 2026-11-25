"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Users, Trash2, Pencil, Mail, Phone, Briefcase, Upload } from "lucide-react";
import { toast } from "sonner";
import { BulkUploadDialog, type BulkColumn } from "@/components/bulk-upload-dialog";

interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  status: string;
  role: string;
}

const DEPARTMENTS = ["Operations", "Sales", "Logistics", "HR", "Finance", "Engineering"];
const STATUSES = ["active", "on-leave", "suspended", "terminated"];
const ROLES = ["employee", "manager", "owner"];

const EMPLOYEE_COLUMNS: BulkColumn[] = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone" },
  { key: "position", label: "Position", default: "Staff" },
  { key: "department", label: "Department", default: "Operations" },
  { key: "employeeNo", label: "Employee No (blank=auto)" },
  { key: "hireDate", label: "Hire Date (YYYY-MM-DD)" },
  { key: "salary", label: "Salary", default: 0 },
  { key: "status", label: "Status", default: "active" },
];

export function EmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee> & { pin?: string; role?: string }>({});

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (dept !== "all") params.set("department", dept);
    if (status !== "all") params.set("status", status);
    fetch(`/api/employees?${params}`)
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  }, [query, dept, status]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ status: "active", department: "Operations", position: "", salary: 3000, hireDate: new Date().toISOString().slice(0, 10), pin: "", role: "employee" });
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      ...emp,
      hireDate: new Date(emp.hireDate).toISOString().slice(0, 10),
      pin: "", // blank = unchanged on edit
      role: emp.role ?? "employee",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    try {
      const url = editing ? `/api/employees/${editing.id}` : "/api/employees";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Save failed");
      toast.success(editing ? "Employee updated" : "Employee added");
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this employee and all related records?")) return;
    const r = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Employee deleted");
      load();
    } else {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Employees"
        description="Directory of all staff — search, filter, add and edit profiles."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Bulk Upload
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add Employee
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, employee no…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : employees.length === 0 ? (
            <EmptyState
              title="No employees found"
              description="Try adjusting filters or add a new employee."
              action={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Employee</Button>}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Hire Date</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {e.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{e.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{e.employeeNo} · {e.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="truncate">{e.position}</TableCell>
                        <TableCell>{e.department}</TableCell>
                        <TableCell>{new Date(e.hireDate).toLocaleDateString()}</TableCell>
                        <TableCell>${e.salary.toLocaleString()}/mo</TableCell>
                        <TableCell><StatusBadge status={e.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(e)} className="h-8 w-8">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => remove(e.id)} className="h-8 w-8 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {employees.map((e) => (
                  <div key={e.id} className="p-3 flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {e.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.position} · {e.department}</p>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {e.email}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {e.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {e.phone}</span>}
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> ${e.salary.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(e.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>
              {editing ? `Update profile for ${editing.name}` : "Create a new employee record"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Full name *</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department ?? "Operations"} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hire date</Label>
              <Input type="date" value={form.hireDate ?? ""} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Salary (monthly)</Label>
              <Input type="number" value={form.salary ?? 0} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Portal PIN</Label>
              <Input
                inputMode="numeric"
                maxLength={8}
                placeholder={editing ? "Enter new PIN to reset (blank = unchanged)" : "e.g. 1234 (defaults to 0000)"}
                value={form.pin ?? ""}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">The PIN the employee uses to sign in at /portal. Tell them in person.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Role</Label>
              <Select value={form.role ?? "employee"} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Owner = full access + Operations overview. Manager = full access. Employee = portal only.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Add employee"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkUploadDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Bulk upload employees"
        description="Upload a CSV of staff to create them all at once. Leave Employee No blank to auto-generate MS-####."
        endpoint="/api/employees/bulk"
        columns={EMPLOYEE_COLUMNS}
        onDone={load}
      />
    </div>
  );
}
