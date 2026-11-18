// Manager payroll — list, create and generate monthly payslips.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";
import { generateForPeriod, computePayslip } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (month && month !== "all") where.month = parseInt(month, 10);
  if (year && year !== "all") where.year = parseInt(year, 10);
  if (employeeId) where.employeeId = employeeId;

  const slips = await db.payslip.findMany({
    where,
    orderBy: [{ year: "desc" }, { month: "desc" }, { employee: { name: "asc" } }],
    include: { employee: { select: { id: true, name: true, employeeNo: true, position: true, department: true, status: true } } },
    take: 500,
  });

  const totals = {
    count: slips.length,
    gross: Math.round(slips.reduce((a, s) => a + s.gross, 0) * 100) / 100,
    deductions: Math.round(slips.reduce((a, s) => a + s.deductions, 0) * 100) / 100,
    net: Math.round(slips.reduce((a, s) => a + s.net, 0) * 100) / 100,
  };
  return json({ slips, totals });
}

export async function POST(req: Request) {
  const body = await parseBody(req);

  // Generate a whole month for all active employees
  if (body.action === "generate") {
    const month = parseInt(String(body.month), 10);
    const year = parseInt(String(body.year), 10);
    if (!month || month < 1 || month > 12 || !year) {
      return err("Valid month (1-12) and year are required", 422);
    }
    const result = await generateForPeriod(month, year);
    return json(result, 201);
  }

  // Manual single payslip — either explicit amounts or computed
  const employeeId = String(body.employeeId ?? "");
  const month = parseInt(String(body.month), 10);
  const year = parseInt(String(body.year), 10);
  if (!employeeId || !month || !year) {
    return err("employeeId, month and year are required", 422);
  }

  const existing = await db.payslip.findUnique({
    where: { employeeId_year_month: { employeeId, year, month } },
  });
  if (existing) return err("A payslip already exists for this employee and period", 409);

  const computed = await computePayslip(employeeId, month, year);
  if (!computed) return err("Employee not found", 404);

  // Allow manual overrides of the computed amounts
  const gross = typeof body.gross === "number" ? body.gross : computed.gross;
  const deductions = typeof body.deductions === "number" ? body.deductions : computed.deductions;
  const net = typeof body.net === "number" ? body.net : Math.round((gross - deductions) * 100) / 100;
  const notes = body.notes != null ? String(body.notes) : computed.notes;

  const slip = await db.payslip.create({
    data: {
      employeeId,
      month,
      year,
      periodLabel: computed.periodLabel,
      baseSalary: computed.baseSalary,
      gross,
      deductions,
      net,
      hours: typeof body.hours === "number" ? body.hours : computed.hours,
      items: JSON.stringify(computed.items),
      notes,
      status: body.status === "draft" ? "draft" : "issued",
      issuedAt: body.status === "draft" ? null : new Date(),
    },
  });
  return json(slip, 201);
}
