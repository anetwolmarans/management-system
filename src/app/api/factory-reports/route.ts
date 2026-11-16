// Factory reports — list, get, create.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { company: { contains: q } },
      { compiledBy: { contains: q } },
    ];
  }
  if (from || to) {
    where.reportDate = {};
    if (from) (where.reportDate as Record<string, unknown>).gte = new Date(from);
    if (to) (where.reportDate as Record<string, unknown>).lte = new Date(to);
  }

  const reports = await db.factoryReport.findMany({
    where,
    orderBy: { reportDate: "desc" },
    take: 200,
  });

  // Decode sections JSON and compute summary stats per report
  return json(
    reports.map((r) => {
      const sections = JSON.parse(r.sections);
      const allItems = sections.flatMap((s: { items?: unknown[] }) => s.items ?? []);
      const openItems = allItems.filter((i) => (i as { status?: string }).status === "open").length;
      const resolvedItems = allItems.filter((i) => (i as { status?: string }).status === "resolved").length;
      return {
        ...r,
        sections,
        siteCount: sections.length,
        itemCount: allItems.length,
        openItems,
        resolvedItems,
      };
    }),
  );
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.title || !body.reportDate || !body.company) {
    return err("title, reportDate and company are required", 422);
  }

  const sections = body.sections ?? [];

  const report = await db.factoryReport.create({
    data: {
      title: body.title,
      reportDate: new Date(body.reportDate as string),
      company: body.company,
      frequency: (body.frequency as string) ?? "DAILY",
      compiledBy: (body.compiledBy as string) ?? "",
      compiledFor: (body.compiledFor as string) ?? null,
      sections: JSON.stringify(sections),
      status: (body.status as string) ?? "submitted",
      notes: (body.notes as string) ?? null,
    },
  });

  return json({ ...report, sections: JSON.parse(report.sections) }, 201);
}
