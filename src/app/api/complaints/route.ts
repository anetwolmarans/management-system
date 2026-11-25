import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const category = searchParams.get("category") ?? "";
  const type = searchParams.get("type") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (type) where.type = type;

  const complaints = await db.complaint.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { employee: true },
    take: 500,
  });
  // Sort by priority manually since sqlite string sort doesn't honor priority levels
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  complaints.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
  return json(complaints);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.employeeId || !body.title) return err("employeeId and title are required", 422);

  const complaint = await db.complaint.create({
    data: {
      employeeId: body.employeeId,
      type: (body.type as string) ?? "complaint",
      title: body.title,
      description: (body.description as string) ?? "",
      category: (body.category as string) ?? "other",
      priority: (body.priority as string) ?? "medium",
      status: "open",
    },
    include: { employee: true },
  });
  return json(complaint, 201);
}
