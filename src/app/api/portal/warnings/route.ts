// Employee portal warnings — list the signed-in employee's own warnings
// (read-only) and let them acknowledge an active one.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);

  const warnings = await db.warning.findMany({
    where: { employeeId: auth.employee.id },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
  });
  return json(warnings);
}

export async function PATCH(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);

  const body = await parseBody<{ id?: string }>(req);
  const id = String(body.id ?? "");
  if (!id) return err("Warning id is required", 422);

  // Make sure the warning belongs to the signed-in employee before acknowledging.
  const existing = await db.warning.findUnique({ where: { id } });
  if (!existing || existing.employeeId !== auth.employee.id) {
    return err("Warning not found", 404);
  }
  if (existing.status !== "active") {
    return err("This warning has already been acknowledged or withdrawn", 422);
  }

  const updated = await db.warning.update({
    where: { id },
    data: { status: "acknowledged", acknowledgedAt: new Date() },
  });
  return json(updated);
}
