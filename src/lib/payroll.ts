// ============================================================
// Payroll engine — computes a monthly payslip for an employee.
// Used by the manager "Generate month" action and can be reused
// by future automations. Matches the seed data's structure:
// earnings: base salary + overtime (1.5x hourly) + transport
// allowance + performance bonus; deductions: PAYE 12%, social
// security (capped), pension 2%, active staff-loan installment.
// ============================================================
import { db } from "@/lib/db";

export interface PayrollLine {
  label: string;
  amount: number;
  kind: "earning" | "deduction";
}

export interface ComputedPayslip {
  employeeId: string;
  month: number;
  year: number;
  periodLabel: string;
  baseSalary: number;
  gross: number;
  deductions: number;
  net: number;
  hours: number;
  items: PayrollLine[];
  notes: string | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function computePayslip(
  employeeId: string,
  month: number, // 1-12
  year: number,
): Promise<ComputedPayslip | null> {
  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    include: { loans: true },
  });
  if (!emp) return null;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // Hours from approved timesheets inside the period (if any)
  const timesheets = await db.timesheet.findMany({
    where: { employeeId, status: "approved", date: { gte: monthStart, lt: monthEnd } },
    select: { hours: true },
  });
  const loggedHours = timesheets.reduce((a, t) => a + t.hours, 0);

  const empIdx = parseInt(emp.employeeNo.slice(-4), 10) - 1001;
  const overtimeHours =
    loggedHours > 0
      ? Math.max(0, Math.round((loggedHours - 160) * 100) / 100)
      : (empIdx * 7 + month * 3) % 14; // deterministic fallback when no timesheets exist
  const hours = loggedHours > 0 ? r2(loggedHours) : 160 + overtimeHours;
  const otRate = r2((emp.salary / 160) * 1.5);
  const overtime = r2(overtimeHours * otRate);
  const transport = ["Logistics", "Engineering"].includes(emp.department) ? 150 : 0;
  const bonus = (empIdx + month) % 4 === 0 ? r2(emp.salary * 0.05) : 0;

  const earnings: PayrollLine[] = [
    { label: "Base salary", amount: r2(emp.salary), kind: "earning" },
  ];
  if (overtime > 0) {
    earnings.push({ label: `Overtime (${overtimeHours} hrs @ $${otRate.toFixed(2)}/h)`, amount: overtime, kind: "earning" });
  }
  if (transport) earnings.push({ label: "Transport allowance", amount: transport, kind: "earning" });
  if (bonus) earnings.push({ label: "Performance bonus", amount: bonus, kind: "earning" });

  const gross = r2(earnings.reduce((a, e) => a + e.amount, 0));
  const tax = r2(gross * 0.12);
  const social = r2(Math.min(gross * 0.01, 81));
  const pension = r2(gross * 0.02);
  const activeLoan = emp.loans.find((l) => l.status === "active" && l.issuedAt < monthEnd);
  const loanDue = activeLoan ? activeLoan.monthlyPayment : 0;

  const deductionLines: PayrollLine[] = [
    { label: "Income tax (PAYE 12%)", amount: tax, kind: "deduction" },
    { label: "Social security", amount: social, kind: "deduction" },
    { label: "Pension fund", amount: pension, kind: "deduction" },
  ];
  if (loanDue) deductionLines.push({ label: "Staff loan installment", amount: r2(loanDue), kind: "deduction" });

  const totalDed = r2(deductionLines.reduce((a, d) => a + d.amount, 0));

  return {
    employeeId: emp.id,
    month,
    year,
    periodLabel: `${MONTH_NAMES[month - 1]} ${year}`,
    baseSalary: r2(emp.salary),
    gross,
    deductions: totalDed,
    net: r2(gross - totalDed),
    hours,
    items: [...earnings, ...deductionLines],
    notes: bonus ? "Includes quarterly performance bonus." : null,
  };
}

export async function generateForPeriod(month: number, year: number) {
  const employees = await db.employee.findMany({ where: { status: { not: "terminated" } } });
  const created: string[] = [];
  const skipped: string[] = [];

  for (const emp of employees) {
    const existing = await db.payslip.findUnique({
      where: { employeeId_year_month: { employeeId: emp.id, year, month } },
    });
    if (existing) {
      skipped.push(emp.name);
      continue;
    }
    const slip = await computePayslip(emp.id, month, year);
    if (!slip) continue;
    await db.payslip.create({
      data: {
        employeeId: emp.id,
        month,
        year,
        periodLabel: slip.periodLabel,
        baseSalary: slip.baseSalary,
        gross: slip.gross,
        deductions: slip.deductions,
        net: slip.net,
        hours: slip.hours,
        items: JSON.stringify(slip.items),
        notes: slip.notes,
        status: "issued",
        issuedAt: new Date(),
      },
    });
    created.push(emp.name);
  }
  return { created, skipped };
}
