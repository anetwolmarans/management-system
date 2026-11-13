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
import { Progress } from "@/components/ui/progress";
import { Banknote, Plus, DollarSign, Wallet, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface Loan {
  id: string;
  employeeId: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  balance: number;
  status: string;
  issuedAt: string;
  employee?: { id: string; name: string; department: string };
}

interface Employee { id: string; name: string; }

export function LoansView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ employeeId: string; principal: number; interestRate: number; termMonths: number }>({
    employeeId: "", principal: 2000, interestRate: 0.05, termMonths: 12,
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    fetch(`/api/loans?${params}`)
      .then((r) => r.json())
      .then(setLoans)
      .catch(() => toast.error("Failed to load loans"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const totalOutstanding = loans.filter((l) => l.status === "active").reduce((s, l) => s + l.balance, 0);
  const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
  const totalMonthly = loans.filter((l) => l.status === "active").reduce((s, l) => s + l.monthlyPayment, 0);

  const payInstallment = async (id: string) => {
    const r = await fetch(`/api/loans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay-installment" }),
    });
    if (r.ok) {
      const data = await r.json();
      toast.success(`Installment of $${data.monthlyPayment.toFixed(2)} paid`);
      load();
    } else toast.error("Payment failed");
  };

  const save = async () => {
    if (!form.employeeId) { toast.error("Select an employee"); return; }
    if (form.principal <= 0) { toast.error("Principal must be positive"); return; }
    const r = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("Loan issued");
      setDialogOpen(false);
      load();
    } else toast.error("Save failed");
  };

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Loans & Advances"
        description="Issue employee loans and track installment payments."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Issue loan
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
            <p className="text-xl font-bold">{fmt(totalOutstanding)}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total principal issued</p>
            <p className="text-xl font-bold">{fmt(totalPrincipal)}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center"><TrendingDown className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly deductions</p>
            <p className="text-xl font-bold">{fmt(totalMonthly)}</p>
          </div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All loans</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paid">Paid off</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : loans.length === 0 ? (
            <EmptyState title="No loans" description="Issue a loan to an employee to begin tracking." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((l) => {
                      const paid = l.principal * (1 + l.interestRate) - l.balance;
                      const total = l.principal * (1 + l.interestRate);
                      const pct = total > 0 ? (paid / total) * 100 : 0;
                      return (
                        <TableRow key={l.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{l.employee?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{l.employee?.department}</p>
                          </TableCell>
                          <TableCell className="text-sm">{new Date(l.issuedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm font-medium">{fmt(l.principal)}</TableCell>
                          <TableCell className="text-sm">{(l.interestRate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-sm">{l.termMonths}mo</TableCell>
                          <TableCell className="text-sm">{fmt(l.monthlyPayment)}</TableCell>
                          <TableCell className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground w-8">{Math.round(pct)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{fmt(l.balance)}</TableCell>
                          <TableCell><StatusBadge status={l.status} /></TableCell>
                          <TableCell className="text-right">
                            {l.status === "active" && (
                              <Button size="sm" variant="outline" className="h-7" onClick={() => payInstallment(l.id)}>
                                Pay installment
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden divide-y">
                {loans.map((l) => {
                  const paid = l.principal * (1 + l.interestRate) - l.balance;
                  const total = l.principal * (1 + l.interestRate);
                  const pct = total > 0 ? (paid / total) * 100 : 0;
                  return (
                    <div key={l.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{l.employee?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(l.issuedAt).toLocaleDateString()} · {l.termMonths}mo term</p>
                        </div>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div><p className="text-muted-foreground">Principal</p><p className="font-medium">{fmt(l.principal)}</p></div>
                        <div><p className="text-muted-foreground">Monthly</p><p className="font-medium">{fmt(l.monthlyPayment)}</p></div>
                        <div><p className="text-muted-foreground">Balance</p><p className="font-medium">{fmt(l.balance)}</p></div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                      </div>
                      {l.status === "active" && (
                        <Button size="sm" variant="outline" className="mt-2 h-7 w-full" onClick={() => payInstallment(l.id)}>
                          Pay ${l.monthlyPayment.toFixed(2)} installment
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue a loan</DialogTitle>
            <DialogDescription>Advance funds to an employee with a repayment plan</DialogDescription>
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
                <Label>Principal ($)</Label>
                <Input type="number" min={100} step={100} value={form.principal} onChange={(e) => setForm({ ...form, principal: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Interest rate</Label>
                <Input type="number" min={0} max={1} step={0.01} value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Term (months)</Label>
                <Input type="number" min={1} max={60} value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) })} />
              </div>
            </div>
            <Card className="bg-muted/40">
              <CardContent className="p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly payment:</span><span className="font-medium">{fmt((form.principal * (1 + form.interestRate)) / form.termMonths)}</span></div>
                <div className="flex justify-between mt-1"><span className="text-muted-foreground">Total repayable:</span><span className="font-medium">{fmt(form.principal * (1 + form.interestRate))}</span></div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Issue loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
