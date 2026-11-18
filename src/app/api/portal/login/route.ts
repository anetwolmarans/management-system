// Employee-app portal login — employee number or email + PIN.
// Creates a server-side session and returns a bearer token for subsequent calls.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";
import { SESSION_DAYS, newSessionToken, purgeExpiredSessions } from "@/lib/portal-auth";

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

  await purgeExpiredSessions();
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.portalSession.create({ data: { token, employeeId: employee.id, expiresAt } });

  return json({
    token,
    expiresAt,
    employee: {
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
    },
  });
}
