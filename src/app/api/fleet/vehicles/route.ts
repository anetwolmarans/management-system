import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET() {
  const vehicles = await db.vehicle.findMany({
    orderBy: { createdAt: "desc" },
    include: { logs: { orderBy: { date: "desc" }, take: 5 } },
  });
  return json(vehicles);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.plateNumber || !body.brand) return err("plateNumber and brand are required", 422);
  const v = await db.vehicle.create({
    data: {
      plateNumber: body.plateNumber,
      brand: body.brand,
      model: (body.model as string) ?? "",
      year: Number(body.year ?? new Date().getFullYear()),
      type: (body.type as string) ?? "car",
      status: (body.status as string) ?? "active",
      assignedTo: (body.assignedTo as string) ?? null,
      mileage: Number(body.mileage ?? 0),
      fuelLevel: Number(body.fuelLevel ?? 100),
    },
  });
  return json(v, 201);
}
