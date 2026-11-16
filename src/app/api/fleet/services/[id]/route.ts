import { db } from "@/lib/db";
import { json } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.serviceRecord.delete({ where: { id } });
  return json({ ok: true });
}
