import { db } from "@/lib/db";
import { json, err } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await db.weeklyReport.findUnique({
    where: { id },
    include: { authoredBy: true },
  });
  if (!report) return err("Report not found", 404);
  return json(report);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.weeklyReport.delete({ where: { id } });
  return json({ ok: true });
}
