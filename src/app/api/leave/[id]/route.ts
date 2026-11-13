import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.reviewedBy !== undefined) data.reviewedBy = body.reviewedBy;
  const updated = await db.leaveRequest.update({
    where: { id },
    data,
    include: { employee: true },
  });
  // When leave approved and employee had no active status change, set status to on-leave if currently active
  if (body.status === "approved") {
    const emp = updated.employee;
    if (emp.status === "active") {
      await db.employee.update({ where: { id: emp.id }, data: { status: "on-leave" } });
    }
  }
  return json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.leaveRequest.delete({ where: { id } });
  return json({ ok: true });
}
