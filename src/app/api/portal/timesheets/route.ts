// Employee portal timesheets — the signed-in employee's recent hours.
import { db } from "@/lib/db";
import { json, err } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);

  const timesheets = await db.timesheet.findMany({
    where: { employeeId: auth.employee.id },
    orderBy: { date: "desc" },
    take: 60,
  });
  return json(timesheets);
}
