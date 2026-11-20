// Admin single-warning API — update status (acknowledge / withdraw / expire) + delete.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "acknowledged", "expired", "withdrawn"];

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await parseBody(req);
  const status = String(body.status ?? "");

  if (status && !STATUSES.includes(status)) return err("Invalid status", 422);

  const data: Record<string, unknown> = {};
  if (status) {
    data.status = status;
    data.acknowledgedAt = status === "acknowledged" ? new Date() : null;
  }

  try {
    const warning = await db.warning.update({ where: { id }, data });
    return json(warning);
  } catch {
    return err("Warning not found", 404);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await db.warning.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return err("Warning not found", 404);
  }
}
