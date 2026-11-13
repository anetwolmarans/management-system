import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.clockOut) {
    data.clockOut = new Date(body.clockOut as string);
    // recalculate hours
    const existing = await db.timesheet.findUnique({ where: { id } });
    if (existing) {
      const hours = ((data.clockOut as Date).getTime() - existing.clockIn.getTime()) / 3600000 - existing.breakMin / 60;
      data.hours = Math.round(Math.max(0, hours) * 100) / 100;
    }
  }
  if (body.breakMin !== undefined) data.breakMin = Number(body.breakMin);
  const updated = await db.timesheet.update({ where: { id }, data, include: { employee: true } });
  return json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.timesheet.delete({ where: { id } });
  return json({ ok: true });
}
