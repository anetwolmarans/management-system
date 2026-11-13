import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;

  const leaves = await db.leaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { employee: true },
    take: 500,
  });
  return json(leaves);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.employeeId || !body.type) return err("employeeId and type are required", 422);
  const start = new Date(body.startDate as string);
  const end = new Date(body.endDate as string);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

  const leave = await db.leaveRequest.create({
    data: {
      employeeId: body.employeeId,
      type: body.type,
      startDate: start,
      endDate: end,
      days,
      reason: (body.reason as string) ?? "",
      status: "pending",
    },
    include: { employee: true },
  });
  return json(leave, 201);
}
