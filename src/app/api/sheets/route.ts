import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET() {
  const sheets = await db.sheet.findMany({ orderBy: { updatedAt: "desc" } });
  return json(
    sheets.map((s) => ({
      ...s,
      columns: JSON.parse(s.columns),
      rows: JSON.parse(s.rows),
    })),
  );
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.name) return err("Sheet name is required", 422);
  const columns = body.columns ?? [
    { id: "c1", name: "Task", type: "text" },
    { id: "c2", name: "Owner", type: "text" },
    { id: "c3", name: "Status", type: "select", options: ["Not Started", "In Progress", "Done"] },
  ];
  const rows = body.rows ?? [];
  const sheet = await db.sheet.create({
    data: {
      name: body.name,
      description: (body.description as string) ?? null,
      columns: JSON.stringify(columns),
      rows: JSON.stringify(rows),
    },
  });
  return json({ ...sheet, columns, rows }, 201);
}
