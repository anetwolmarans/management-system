import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET() {
  const vehicles = await db.vehicle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      logs: { orderBy: { date: "desc" }, take: 5 },
      inspections: { orderBy: { date: "desc" }, take: 3 },
      services: { orderBy: { date: "desc" }, take: 3 },
    },
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
      vin: (body.vin as string) ?? null,
      purchasePrice: body.purchasePrice ? Number(body.purchasePrice) : null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate as string) : null,
      supplier: (body.supplier as string) ?? null,
      color: (body.color as string) ?? null,
      insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry as string) : null,
      registrationExpiry: body.registrationExpiry ? new Date(body.registrationExpiry as string) : null,
    },
  });
  return json(v, 201);
}
