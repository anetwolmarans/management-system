import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);

  // "Mark done" action — record completion and recompute next due
  if (body.action === "mark-done") {
    const sched = await db.maintenanceSchedule.findUnique({ where: { id }, include: { vehicle: true } });
    if (!sched) return err("Schedule not found", 404);
    const doneDate = new Date();
    const doneMileage = Number(body.mileage ?? sched.vehicle.mileage);
    const nextDueDate = sched.intervalDays ? new Date(doneDate.getTime() + sched.intervalDays * 86400000) : sched.nextDueDate;
    const nextDueMileage = sched.intervalMileage ? doneMileage + sched.intervalMileage : sched.nextDueMileage;
    const updated = await db.maintenanceSchedule.update({
      where: { id },
      data: {
        lastPerformedDate: doneDate,
        lastPerformedMileage: doneMileage,
        nextDueDate,
        nextDueMileage,
      },
      include: { vehicle: true },
    });
    return json(updated);
  }

  const data: Record<string, unknown> = {};
  for (const k of ["task", "intervalType", "notes"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.intervalMileage !== undefined) data.intervalMileage = body.intervalMileage ? Number(body.intervalMileage) : null;
  if (body.intervalDays !== undefined) data.intervalDays = body.intervalDays ? Number(body.intervalDays) : null;
  if (body.nextDueDate !== undefined) data.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate as string) : null;
  if (body.nextDueMileage !== undefined) data.nextDueMileage = body.nextDueMileage ? Number(body.nextDueMileage) : null;
  const updated = await db.maintenanceSchedule.update({ where: { id }, data, include: { vehicle: true } });
  return json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.maintenanceSchedule.delete({ where: { id } });
  return json({ ok: true });
}
