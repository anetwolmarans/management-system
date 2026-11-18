"use client";

// Manager Payroll — generate monthly payslips, review totals,
// download branded PDFs and manage records.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ReceiptText, FileDown, Trash2, Sparkles, Plus, Loader2, Wallet, TrendingDown, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader, StatusBadge, EmptyState, KpiCard } from "@/components/ui-bits";
import { fmtDate, fmtMoney } from "@/lib/format";

interface SlipRow {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  periodLabel: string;
  gross: number;
  deductions: number;
  net: number;
  hours: number;
  status: string;
  notes: string | null;
  issuedAt: string | null;
  employee: { id: string; name: string; employeeNo: string; position: string; department: string; status: string };
}

interface Totals {
  count: number;
  gross: number;
  deductions: number;
  net: number;
}

interface EmployeeLite {
  id: string;
  name: string;
  employeeNo: string;
  status: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = [new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].filter((y, i, a) => a.indexOf(y) === i);

export function PayrollView() {
  const now = new Date();
  // Default period = previous month (the last complete payroll cycle)
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [month, setMonth] = useState(String(prevMonth));
  const [year, setYear] = useState(String(prevYear));
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ count: 0, gross: 0, deductions: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [addEmployee, setAddEmployee] = useState("");
  const [addMonth, setAddMonth] = useState(String(prevMonth));
  const [addYear, setAddYear] = useState(String(prevYear));
  const [adding, setAdding] = useState(false);

  const periodLabel = `${MONTHS[parseInt(month, 10) - 1]} ${year}`;

  const load = async (m = month, y = year) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/payslips?month=${m}&year=${y}`);
      const d = await r.json();
      setSlips(d.slips ?? []);
      setTotals(d.totals ?? { count: 0, gross: 0, deductions: 0, net: 0 });
    } catch {
      toast.error("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => load());
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const changePeriod = (m: string, y: string) => {
    setMonth(m);
    setYear(y);
    Promise.resolve().then(() => load(m, y));
  };

  const generateMonth = async () => {
    setGenerating(true);
    toast.loading(`Generating payslips for ${periodLabel}…`, { id: "generate" });
    try {
      const r = await fetch("/api/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", month: parseInt(month, 10), year: parseInt(year, 10) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const created = d.created?.length ?? 0;
      const skipped = d.skipped?.length ?? 0;
      toast.success(
        created > 0
          ? `${created} payslip${created === 1 ? "" : "s"} generated for ${periodLabel}${skipped ? ` · ${skipped} already existed` : ""}`
          : `All payslips for ${periodLabel} already exist`,
        { id: "generate" },
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed", { id: "generate" });
    } finally {
      setGenerating(false);
    }
  };

  const addPayslip = async () => {
    if (!addEmployee) {
      toast.error("Select an employee");
      return;
    }
    setAdding(true);
    try {
      const r = await fetch("/api/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: addEmployee,
          month: parseInt(addMonth, 10),
          year: parseInt(addYear, 10),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Payslip created & issued");
      setAddOpen(false);
      setAddEmployee("");
      setMonth(addMonth);
      setYear(addYear);
      await load(addMonth, addYear);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create payslip");
    } finally {
      setAdding(false);
    }
  };

  const removeSlip = async (slip: SlipRow) => {
    if (!confirm(`Delete the ${slip.periodLabel} payslip for ${slip.employee.name}?`)) return;
    try {
      const r = await fetch(`/api/payslips/${slip.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Payslip deleted");
      await load();
    } catch {
      toast.error("Failed to delete payslip");
    }
  };

  const pdfUrl = (id: string) => `/api/portal/payslips/${id}/pdf`;

  // employees without a payslip this period (shown under the table)
  const covered = useMemo(() => new Set(slips.map((s) => s.employeeId)), [slips]);
  const missing = employees.filter((e) => e.status !== "terminated" && !covered.has(e.id));

  return (
    <div>
      <SectionHeader
        title="Payroll"
        description="Monthly payslips — employees see issued slips instantly in the BAYWASH employee app"
        actions={
          <>
            <Button variant="outline" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add payslip
            </Button>
            <Button onClick={generateMonth} disabled={generating} className="gap-2 bg-[#00AEEF] text-[#01205E] hover:bg-[#00AEEF]/90 font-semibold">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate {periodLabel}
            </Button>
          </>
        }
      />

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Period</span>
        <Select value={month} onValueChange={(v) => changePeriod(v, year)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={(v) => changePeriod(month, v)}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <KpiCard label="Payslips issued" value={totals.count} hint={`for ${periodLabel}`} icon={ReceiptText} accent="cyan" />
        <KpiCard label="Gross payroll" value={fmtMoney(totals.gross)} hint="before deductions" icon={Wallet} accent="violet" />
        <KpiCard label="Total deductions" value={fmtMoney(totals.deductions)} hint="tax · social · pension · loans" icon={TrendingDown} accent="amber" />
        <KpiCard label="Net paid" value={fmtMoney(totals.net)} hint="transferred to employees" icon={Landmark} accent="emerald" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading payslips…
            </div>
          ) : slips.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title={`No payslips for ${periodLabel}`}
              description={`Generate payslips for all active employees in one click, or add one manually.`}
              action={
                <Button onClick={generateMonth} disabled={generating} className="gap-2 bg-[#00AEEF] text-[#01205E] hover:bg-[#00AEEF]/90 font-semibold">
                  <Sparkles className="h-4 w-4" /> Generate {periodLabel}
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slips.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium leading-tight">{s.employee?.name}</div>
                        <div className="text-xs text-muted-foreground">{s.employee?.employeeNo} · {s.employee?.position}</div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{s.periodLabel}</TableCell>
                      <TableCell className="text-sm text-right">{s.hours.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right">{fmtMoney(s.gross)}</TableCell>
                      <TableCell className="text-sm text-right text-rose-600 dark:text-rose-400">−{fmtMoney(s.deductions)}</TableCell>
                      <TableCell className="text-sm text-right font-bold">{fmtMoney(s.net)}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="sm" variant="outline" className="h-7 gap-1.5">
                            <a href={pdfUrl(s.id)} target="_blank" rel="noreferrer">
                              <FileDown className="h-3.5 w-3.5" /> PDF
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-rose-600 hover:text-rose-700"
                            onClick={() => removeSlip(s)}
                            aria-label={`Delete payslip for ${s.employee?.name}`}
                          >
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

      {missing.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {missing.length} employee{missing.length === 1 ? "" : "s"} without a {periodLabel} payslip:{" "}
          {missing.slice(0, 5).map((e) => e.name).join(", ")}
          {missing.length > 5 ? ` +${missing.length - 5} more` : ""} — use “Generate {periodLabel}” to fill the gaps.
        </p>
      )}

      {/* Add payslip dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a payslip</DialogTitle>
            <DialogDescription>
              Amounts are computed from salary, approved hours and active loans. You can adjust totals afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={addEmployee} onValueChange={setAddEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.status !== "terminated")
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.employeeNo})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={addMonth} onValueChange={setAddMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={addYear} onValueChange={setAddYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Note (optional)" id="payslip-note" disabled />
            <p className="text-[11px] text-muted-foreground -mt-2">Notes can be edited after creation.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addPayslip} disabled={adding} className="gap-2">
              {adding && <Loader2 className="h-4 w-4 animate-spin" />} Create & issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1.5">
        <ReceiptText className="h-3 w-3" />
        Payslips marked “issued” appear immediately in each employee&apos;s BAYWASH app — e.g. issued {slips[0]?.issuedAt ? fmtDate(slips[0].issuedAt) : "—"}.
      </p>
    </div>
  );
}
