// Maintenance schedules — list with computed status (overdue/due-soon/ok).
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

const OVERDUE_DAYS_THRESHOLD = 0; // due date passed
const DUE_SOON_DAYS_THRESHOLD = 14; // within 14 days
const DUE_SOON_MILEAGE_THRESHOLD = 1000; // within 1000 km

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const status = searchParams.get("status") ?? ""; // overdue | due-soon | ok

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;

  const schedules = await db.maintenanceSchedule.findMany({
    where,
    orderBy: { nextDueDate: "asc" },
    include: { vehicle: true },
    take: 500,
  });

  const now = new Date();

  const enriched = schedules.map((s) => {
    const daysUntilDue = s.nextDueDate
      ? Math.floor((s.nextDueDate.getTime() - now.getTime()) / 86400000)
      : null;
    const vehicle = s.vehicle;
    const mileageUntilDue = s.nextDueMileage ? s.nextDueMileage - (vehicle?.mileage ?? 0) : null;

    let computedStatus: "ok" | "due-soon" | "overdue" = "ok";
    if (s.nextDueDate && daysUntilDue !== null && daysUntilDue < OVERDUE_DAYS_THRESHOLD) {
      computedStatus = "overdue";
    } else if (s.nextDueMileage && mileageUntilDue !== null && mileageUntilDue < 0) {
      computedStatus = "overdue";
    } else if (
      (s.nextDueDate && daysUntilDue !== null && daysUntilDue < DUE_SOON_DAYS_THRESHOLD) ||
      (s.nextDueMileage && mileageUntilDue !== null && mileageUntilDue < DUE_SOON_MILEAGE_THRESHOLD)
    ) {
      computedStatus = "due-soon";
    }

    return {
      ...s,
      vehicle,
      computedStatus,
      daysUntilDue,
      mileageUntilDue,
    };
  });

  const filtered = status ? enriched.filter((s) => s.computedStatus === status) : enriched;
  return json(filtered);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.vehicleId || !body.task) return err("vehicleId and task are required", 422);

  // Compute next due based on last performed
  const lastDate = body.lastPerformedDate ? new Date(body.lastPerformedDate as string) : new Date();
  const lastMileage = Number(body.lastPerformedMileage ?? 0);
  const intervalDays = body.intervalDays ? Number(body.intervalDays) : null;
  const intervalMileage = body.intervalMileage ? Number(body.intervalMileage) : null;

  let nextDueDate: Date | null = null;
  let nextDueMileage: number | null = null;
  if (intervalDays) {
    nextDueDate = new Date(lastDate);
    nextDueDate.setDate(nextDueDate.getDate() + intervalDays);
  }
  if (intervalMileage) {
    nextDueMileage = lastMileage + intervalMileage;
  }

  const sched = await db.maintenanceSchedule.create({
    data: {
      vehicleId: body.vehicleId,
      task: body.task,
      intervalType: body.intervalType ?? "both",
      intervalMileage,
      intervalDays,
      lastPerformedDate: body.lastPerformedDate ? lastDate : null,
      lastPerformedMileage: body.lastPerformedMileage ? lastMileage : null,
      nextDueDate,
      nextDueMileage,
      notes: (body.notes as string) ?? null,
    },
    include: { vehicle: true },
  });
  return json(sched, 201);
}
