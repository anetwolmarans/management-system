import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;

  const loans = await db.loan.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    include: { employee: true },
    take: 500,
  });
  return json(loans);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.employeeId || !body.principal) return err("employeeId and principal are required", 422);

  const principal = Number(body.principal);
  const interestRate = Number(body.interestRate ?? 0);
  const termMonths = Number(body.termMonths ?? 6);
  const monthlyPayment = (principal * (1 + interestRate)) / termMonths;

  const loan = await db.loan.create({
    data: {
      employeeId: body.employeeId,
      principal,
      interestRate,
      termMonths,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      balance: Math.round((principal * (1 + interestRate)) * 100) / 100,
      status: "active",
      issuedAt: body.issuedAt ? new Date(body.issuedAt as string) : new Date(),
    },
    include: { employee: true },
  });
  return json(loan, 201);
}
