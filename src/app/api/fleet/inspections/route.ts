// Vehicle inspections — list with optional filters; create with auto-flag.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const flaggedOnly = searchParams.get("flagged") === "true";
  const unacknowledgedOnly = searchParams.get("unacknowledged") === "true";

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (flaggedOnly) {
    where.flagged = true;
  }
  if (unacknowledgedOnly) {
    where.flagged = true;
    where.acknowledgedBy = null;
  }

  const inspections = await db.vehicleInspection.findMany({
    where,
    orderBy: { date: "desc" },
    include: { vehicle: true, inspector: true },
    take: 500,
  });
  return json(inspections);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.vehicleId || !body.items) return err("vehicleId and items are required", 422);

  const items = body.items as Array<{ id: string; name: string; status: "ok" | "warning" | "fail"; notes?: string }>;
  const hasFail = items.some((i) => i.status === "fail");
  const hasWarn = items.some((i) => i.status === "warning");
  const overallStatus = hasFail ? "fail" : hasWarn ? "warning" : "pass";
  const flagged = hasFail || hasWarn;

  const inspection = await db.vehicleInspection.create({
    data: {
      vehicleId: body.vehicleId,
      inspectorId: (body.inspectorId as string) ?? null,
      date: body.date ? new Date(body.date as string) : new Date(),
      overallStatus,
      flagged,
      items: JSON.stringify(items),
      notes: (body.notes as string) ?? null,
      odoReading: body.odoReading ? Number(body.odoReading) : null,
    },
    include: { vehicle: true, inspector: true },
  });

  // If flagged, also bump vehicle status to "maintenance" so it shows on the dashboard
  if (flagged) {
    await db.vehicle.update({
      where: { id: body.vehicleId },
      data: { status: "maintenance" },
    });
  }

  return json(inspection, 201);
}
