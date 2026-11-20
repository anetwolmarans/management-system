// Employee portal loans — the signed-in employee's loan history.
import { db } from "@/lib/db";
import { json, err } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);

  const loans = await db.loan.findMany({
    where: { employeeId: auth.employee.id },
    orderBy: { issuedAt: "desc" },
  });
  return json(loans);
}
