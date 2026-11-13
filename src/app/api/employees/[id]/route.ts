import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emp = await db.employee.findUnique({
    where: { id },
    include: {
      timesheets: { orderBy: { date: "desc" }, take: 20 },
      leaves: { orderBy: { createdAt: "desc" }, take: 10 },
      complaints: { orderBy: { createdAt: "desc" }, take: 10 },
      loans: { orderBy: { issuedAt: "desc" }, take: 10 },
      fleetLogs: { orderBy: { date: "desc" }, take: 10, include: { vehicle: true } },
    },
  });
  if (!emp) return err("Employee not found", 404);
  return json(emp);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  for (const k of ["name", "email", "phone", "position", "department", "status", "avatar"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.hireDate) data.hireDate = new Date(body.hireDate as string);
  if (body.salary !== undefined) data.salary = Number(body.salary);
  try {
    const updated = await db.employee.update({ where: { id }, data });
    return json(updated);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.employee.delete({ where: { id } });
    return json({ ok: true });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
