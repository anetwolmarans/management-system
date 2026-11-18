// Employee-app portal login — employee number or email + PIN.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseBody(req);
  const identifier = String(body.identifier ?? "").trim();
  const pin = String(body.pin ?? "").trim();

  if (!identifier || !pin) return err("Employee number / email and PIN are required", 422);

  const employee = await db.employee.findFirst({
    where: {
      OR: [{ employeeNo: identifier.toUpperCase() }, { email: identifier.toLowerCase() }],
    },
  });

  if (!employee || employee.pin !== pin) {
    return err("Invalid credentials. Check your employee number and PIN.", 401);
  }
  if (employee.status === "terminated") {
    return err("This account is no longer active. Contact HR.", 403);
  }

  return json({
    id: employee.id,
    employeeNo: employee.employeeNo,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    position: employee.position,
    department: employee.department,
    hireDate: employee.hireDate,
    salary: employee.salary,
    status: employee.status,
  });
}
