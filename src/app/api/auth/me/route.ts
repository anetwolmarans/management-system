// Manager session check — returns the signed-in manager's profile + role.
import { json, err } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);
  return json({
    id: auth.employee.id,
    employeeNo: auth.employee.employeeNo,
    name: auth.employee.name,
    email: auth.employee.email,
    position: auth.employee.position,
    department: auth.employee.department,
    role: auth.employee.role,
  });
}
