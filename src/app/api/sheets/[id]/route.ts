import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.columns !== undefined) data.columns = JSON.stringify(body.columns);
  if (body.rows !== undefined) data.rows = JSON.stringify(body.rows);
  const updated = await db.sheet.update({ where: { id }, data });
  return json({
    ...updated,
    columns: JSON.parse(updated.columns),
    rows: JSON.parse(updated.rows),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.sheet.delete({ where: { id } });
  return json({ ok: true });
}
