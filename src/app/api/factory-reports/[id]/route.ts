import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await db.factoryReport.findUnique({ where: { id } });
  if (!report) return err("Report not found", 404);
  return json({ ...report, sections: JSON.parse(report.sections) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req);
  const data: Record<string, unknown> = {};
  for (const k of ["title", "company", "frequency", "compiledBy", "compiledFor", "status", "notes"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.reportDate !== undefined) data.reportDate = new Date(body.reportDate as string);
  if (body.sections !== undefined) data.sections = JSON.stringify(body.sections);

  const updated = await db.factoryReport.update({
    where: { id },
    data,
  });
  return json({ ...updated, sections: JSON.parse(updated.sections) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.factoryReport.delete({ where: { id } });
  return json({ ok: true });
}
