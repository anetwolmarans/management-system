import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.priority) data.priority = body.priority;
  if (body.resolution !== undefined) data.resolution = body.resolution;
  if (body.status === "resolved" || body.status === "dismissed") {
    data.resolvedAt = new Date();
  }
  const updated = await db.complaint.update({
    where: { id },
    data,
    include: { employee: true },
  });
  return json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.complaint.delete({ where: { id } });
  return json({ ok: true });
}
