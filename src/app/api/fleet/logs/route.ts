import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  const logs = await db.fleetLog.findMany({
    where,
    orderBy: { date: "desc" },
    include: { vehicle: true, employee: true },
    take: 500,
  });
  return json(logs);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.vehicleId) return err("vehicleId is required", 422);
  const startOdo = Number(body.startOdometer ?? 0);
  const endOdo = Number(body.endOdometer ?? 0);
  const distance = body.distance !== undefined ? Number(body.distance) : Math.max(0, endOdo - startOdo);

  const log = await db.fleetLog.create({
    data: {
      vehicleId: body.vehicleId,
      employeeId: (body.employeeId as string) ?? null,
      date: body.date ? new Date(body.date as string) : new Date(),
      startOdometer: startOdo,
      endOdometer: endOdo,
      distance,
      fuelCost: Number(body.fuelCost ?? 0),
      purpose: (body.purpose as string) ?? "",
    },
    include: { vehicle: true, employee: true },
  });

  // Update vehicle mileage and fuel level
  await db.vehicle.update({
    where: { id: body.vehicleId },
    data: {
      mileage: endOdo,
      fuelLevel: Math.max(0, Math.min(100, 100 - Math.floor(distance / 8))),
    },
  });

  return json(log, 201);
}
