// Service records — list and create.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const type = searchParams.get("type") ?? "";

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (type) where.type = type;

  const services = await db.serviceRecord.findMany({
    where,
    orderBy: { date: "desc" },
    include: { vehicle: true, performedBy: true },
    take: 500,
  });
  return json(
    services.map((s) => ({
      ...s,
      partsReplaced: JSON.parse(s.partsReplaced),
    })),
  );
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.vehicleId || !body.type) return err("vehicleId and type are required", 422);

  const partsReplaced = body.partsReplaced ?? [];
  const cost = Number(body.cost ?? 0);

  const service = await db.serviceRecord.create({
    data: {
      vehicleId: body.vehicleId,
      type: body.type,
      description: (body.description as string) ?? "",
      date: body.date ? new Date(body.date as string) : new Date(),
      mileage: Number(body.mileage ?? 0),
      cost,
      performedById: (body.performedById as string) ?? null,
      supplier: (body.supplier as string) ?? null,
      partsReplaced: JSON.stringify(partsReplaced),
      notes: (body.notes as string) ?? null,
    },
    include: { vehicle: true, performedBy: true },
  });

  // Update related maintenance schedule(s) for this vehicle that match this service type
  const matchingSchedules = await db.maintenanceSchedule.findMany({
    where: { vehicleId: body.vehicleId, task: { contains: serviceTypeToTaskKeyword(body.type) } },
  });
  for (const sched of matchingSchedules) {
    const nextDueDate = sched.intervalDays
      ? new Date(Date.now() + sched.intervalDays * 86400000)
      : sched.nextDueDate;
    const nextDueMileage = sched.intervalMileage
      ? Number(body.mileage ?? 0) + sched.intervalMileage
      : sched.nextDueMileage;
    await db.maintenanceSchedule.update({
      where: { id: sched.id },
      data: {
        lastPerformedDate: body.date ? new Date(body.date as string) : new Date(),
        lastPerformedMileage: Number(body.mileage ?? 0),
        nextDueDate,
        nextDueMileage,
      },
    });
  }

  // Update vehicle mileage if service mileage is higher
  const veh = await db.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (veh && Number(body.mileage ?? 0) > veh.mileage) {
    await db.vehicle.update({
      where: { id: body.vehicleId },
      data: { mileage: Number(body.mileage) },
    });
  }

  return json({ ...service, partsReplaced: JSON.parse(service.partsReplaced) }, 201);
}

function serviceTypeToTaskKeyword(type: string): string {
  const map: Record<string, string> = {
    "oil-change": "Oil",
    "wheel-rotation": "Wheel",
    "brake-service": "Brake",
    "tire-replacement": "Tire",
    "battery": "Battery",
    "filter": "Filter",
    "inspection": "inspection",
  };
  return map[type] ?? type;
}
