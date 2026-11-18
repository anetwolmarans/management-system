// Employee-app leave list + submission — approval status of each request.
// Scoped to the signed-in employee via the portal session token.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

const LEAVE_TYPES = ["annual", "sick", "unpaid", "emergency", "maternity"];

export async function GET(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);

  const leaves = await db.leaveRequest.findMany({
    where: { employeeId: auth.employee.id },
    orderBy: [{ startDate: "desc" }],
    take: 50,
  });
  return json(leaves);
}

export async function POST(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);

  const body = await parseBody(req);
  const type = String(body.type ?? "");
  const start = new Date(body.startDate as string);
  const end = new Date(body.endDate as string);
  const reason = String(body.reason ?? "").trim();

  if (!LEAVE_TYPES.includes(type)) return err("Choose a valid leave type", 422);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return err("Valid start and end dates are required", 422);
  if (end < start) return err("The end date cannot be before the start date", 422);

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

  const leave = await db.leaveRequest.create({
    data: {
      employeeId: auth.employee.id,
      type,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: "pending",
    },
  });
  return json(leave, 201);
}
