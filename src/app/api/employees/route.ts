import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const department = searchParams.get("department") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { employeeNo: { contains: q } },
      { position: { contains: q } },
    ];
  }
  if (department) where.department = department;
  if (status) where.status = status;

  const employees = await db.employee.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return json(employees);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body.name || !body.email) return err("Name and email are required", 422);

  // Generate employee number if not provided
  let employeeNo = body.employeeNo as string | undefined;
  if (!employeeNo) {
    const count = await db.employee.count();
    employeeNo = `WH-${String(1001 + count).padStart(4, "0")}`;
  }

  try {
    const emp = await db.employee.create({
      data: {
        employeeNo,
        name: body.name,
        email: body.email,
        phone: (body.phone as string) ?? null,
        position: (body.position as string) ?? "Staff",
        department: (body.department as string) ?? "Operations",
        hireDate: body.hireDate ? new Date(body.hireDate as string) : new Date(),
        salary: Number(body.salary ?? 0),
        status: (body.status as string) ?? "active",
        avatar: (body.avatar as string) ?? null,
      },
    });
    return json(emp, 201);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
