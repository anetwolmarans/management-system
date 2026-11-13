import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);

  // Apply installment payment if requested
  if (body.action === "pay-installment") {
    const loan = await db.loan.findUnique({ where: { id } });
    if (!loan) return err("Loan not found", 404);
    const newBalance = Math.round((loan.balance - loan.monthlyPayment) * 100) / 100;
    const updated = await db.loan.update({
      where: { id },
      data: {
        balance: Math.max(0, newBalance),
        status: newBalance <= 0 ? "paid" : "active",
      },
      include: { employee: true },
    });
    return json(updated);
  }

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.balance !== undefined) data.balance = Number(body.balance);
  const updated = await db.loan.update({
    where: { id },
    data,
    include: { employee: true },
  });
  return json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.loan.delete({ where: { id } });
  return json({ ok: true });
}
