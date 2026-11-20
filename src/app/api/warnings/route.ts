// Admin warnings API — list (optionally filtered by employee) + create.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const TYPES = ["verbal", "written", "final", "performance", "safety"];
const STATUSES = ["active", "acknowledged", "expired", "withdrawn"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  const warnings = await db.warning.findMany({
    where,
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    include: { employee: { select: { id: true, name: true, employeeNo: true, department: true } } },
  });
  return json(warnings);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  const employeeId = String(body.employeeId ?? "");
  const type = String(body.type ?? "");
  const subject = String(body.subject ?? "").trim();
  const details = String(body.details ?? "").trim();
  const issuedBy = String(body.issuedBy ?? "").trim() || "Management";

  if (!employeeId) return err("Select an employee", 422);
  if (!TYPES.includes(type)) return err("Choose a valid warning type", 422);
  if (!subject) return err("Subject is required", 422);
  if (!details) return err("Details are required", 422);

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return err("Employee not found", 404);

  const issuedAt = body.issuedAt ? new Date(body.issuedAt as string) : new Date();
  if (isNaN(issuedAt.getTime())) return err("Invalid issue date", 422);

  const warning = await db.warning.create({
    data: {
      employeeId,
      type,
      subject,
      details,
      issuedBy,
      issuedAt,
      status: "active",
    },
    include: { employee: { select: { id: true, name: true, employeeNo: true, department: true } } },
  });
  return json(warning, 201);
}
