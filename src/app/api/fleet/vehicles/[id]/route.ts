import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  for (const k of ["plateNumber", "brand", "model", "type", "status", "assignedTo"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.year !== undefined) data.year = Number(body.year);
  if (body.mileage !== undefined) data.mileage = Number(body.mileage);
  if (body.fuelLevel !== undefined) data.fuelLevel = Number(body.fuelLevel);
  const updated = await db.vehicle.update({ where: { id }, data });
  return json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.vehicle.delete({ where: { id } });
  return json({ ok: true });
}
