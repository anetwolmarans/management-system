// Download an employee's payslip as a branded PDF document.
import { db } from "@/lib/db";
import { err } from "@/lib/api";
import { generatePayslipPdf, PayslipLine } from "@/lib/payslip-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  // Optional ownership check — employees can only fetch their own slips
  const employeeId = searchParams.get("employeeId");

  const slip = await db.payslip.findUnique({ where: { id }, include: { employee: true } });
  if (!slip) return err("Payslip not found", 404);
  if (employeeId && slip.employeeId !== employeeId) return err("Not allowed", 403);

  let lines: PayslipLine[] = [];
  try {
    lines = JSON.parse(slip.items) as PayslipLine[];
  } catch {
    lines = [];
  }
  const earnings = lines.filter((l) => l.kind === "earning");
  const deductionLines = lines.filter((l) => l.kind === "deduction");

  // Year-to-date figures for the same year
  const ytdSlips = await db.payslip.findMany({
    where: { employeeId: slip.employeeId, year: slip.year },
    orderBy: [{ month: "asc" }],
  });
  let ytdGross = 0;
  let ytdTax = 0;
  let ytdNet = 0;
  for (const s of ytdSlips) {
    ytdGross += s.gross;
    ytdNet += s.net;
    try {
      const parsed = JSON.parse(s.items) as PayslipLine[];
      ytdTax += parsed
        .filter((l) => l.kind === "deduction" && /tax|social/i.test(l.label))
        .reduce((a, l) => a + l.amount, 0);
    } catch {
      /* ignore malformed items */
    }
  }
  const ytd = {
    gross: ytdGross,
    tax: Math.round(ytdTax * 100) / 100,
    net: ytdNet,
  };

  const buffer = await generatePayslipPdf({
    periodLabel: slip.periodLabel,
    payDate: new Date(slip.issuedAt ?? slip.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    }),
    employee: {
      name: slip.employee.name,
      employeeNo: slip.employee.employeeNo,
      position: slip.employee.position,
      department: slip.employee.department,
      email: slip.employee.email,
      phone: slip.employee.phone ?? "",
      hireDate: new Date(slip.employee.hireDate).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      }),
      bankRef: `MS-${slip.employee.employeeNo.slice(-4)}-XXXX`,
    },
    hours: slip.hours,
    gross: slip.gross,
    deductions: slip.deductions,
    net: slip.net,
    baseSalary: slip.baseSalary,
    notes: slip.notes,
    earnings,
    deductionLines,
    ytd,
  });

  const filename = `Payslip_${slip.employee.name.replace(/[^a-zA-Z0-9]+/g, "_")}_${slip.year}-${String(slip.month).padStart(2, "0")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
