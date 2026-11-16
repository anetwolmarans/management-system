import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  if (body.acknowledgedBy !== undefined) {
    data.acknowledgedBy = body.acknowledgedBy;
    data.acknowledgedAt = body.acknowledgedBy ? new Date() : null;
  }
  if (body.notes !== undefined) data.notes = body.notes;
  const updated = await db.vehicleInspection.update({
    where: { id },
    data,
    include: { vehicle: true, inspector: true },
  });
  return json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.vehicleInspection.delete({ where: { id } });
  return json({ ok: true });
}
