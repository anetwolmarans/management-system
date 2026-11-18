// Manager payroll — update or delete a payslip.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await parseBody(req);

  const data: Record<string, unknown> = {};
  if (body.status === "draft" || body.status === "issued") {
    data.status = body.status;
    data.issuedAt = body.status === "issued" ? new Date() : null;
  }
  if (typeof body.notes === "string") data.notes = body.notes;
  if (typeof body.gross === "number" || typeof body.deductions === "number" || typeof body.net === "number") {
    const slip = await db.payslip.findUnique({ where: { id } });
    if (!slip) return err("Payslip not found", 404);
    const gross = typeof body.gross === "number" ? body.gross : slip.gross;
    const deductions = typeof body.deductions === "number" ? body.deductions : slip.deductions;
    data.gross = gross;
    data.deductions = deductions;
    data.net = typeof body.net === "number" ? body.net : Math.round((gross - deductions) * 100) / 100;
  }
  if (Object.keys(data).length === 0) return err("Nothing to update", 422);

  const slip = await db.payslip.update({ where: { id }, data });
  return json(slip);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await db.payslip.delete({ where: { id } });
  } catch {
    return err("Payslip not found", 404);
  }
  return json({ ok: true });
}
