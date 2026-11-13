import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  const timesheets = await db.timesheet.findMany({
    where,
    orderBy: { date: "desc" },
    include: { employee: true },
    take: 500,
  });
  return json(timesheets);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.employeeId) return err("employeeId is required", 422);

  const clockIn = body.clockIn ? new Date(body.clockIn as string) : new Date();
  const clockOut = body.clockOut ? new Date(body.clockOut as string) : null;
  const breakMin = Number(body.breakMin ?? 30);
  let hours = 0;
  if (clockOut) {
    hours = (clockOut.getTime() - clockIn.getTime()) / 3600000 - breakMin / 60;
    if (hours < 0) hours = 0;
  }

  const ts = await db.timesheet.create({
    data: {
      employeeId: body.employeeId,
      date: body.date ? new Date(body.date as string) : clockIn,
      clockIn,
      clockOut,
      breakMin,
      hours: Math.round(hours * 100) / 100,
      status: (body.status as string) ?? "pending",
      notes: (body.notes as string) ?? null,
    },
    include: { employee: true },
  });
  return json(ts, 201);
}
