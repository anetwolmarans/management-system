// Manager login — same employee number + PIN as the portal, but the
// employee must have role "owner" or "manager" to access the manager suite.
// Reuses the PortalSession model for the session token.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";
import { SESSION_DAYS, newSessionToken, purgeExpiredSessions } from "@/lib/portal-auth";
import { verifyPin, hashPin, isHashedPin } from "@/lib/pin-hash";
import { checkRateLimit, recordFailure, recordSuccess } from "@/lib/login-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseBody(req);
  const identifier = String(body.identifier ?? "").trim();
  const pin = String(body.pin ?? "").trim();

  if (!identifier || !pin) return err("Enter your employee number and PIN.", 422);

  const limit = checkRateLimit(identifier);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterSec / 60);
    return err(`Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, 429);
  }

  const isAllDigits = /^\d+$/.test(identifier);
  const orConditions = [{ employeeNo: identifier.toUpperCase() }];
  if (isAllDigits) {
    orConditions.push({ employeeNo: { endsWith: `-${identifier}` } });
  }

  const employee = await db.employee.findFirst({ where: { OR: orConditions } });

  const GENERIC = "Invalid employee number or PIN.";

  if (!employee || !verifyPin(pin, employee.pin)) {
    recordFailure(identifier);
    return err(GENERIC, 401);
  }

  if (employee.status === "terminated") {
    return err("This account is no longer active. Contact HR.", 403);
  }

  // Role gate — only owners and managers can access the manager suite.
  if (employee.role !== "owner" && employee.role !== "manager") {
    recordFailure(identifier);
    return err("Your profile doesn't have manager access. Use the Employee App at /portal instead.", 403);
  }

  // Progressive PIN upgrade.
  if (!isHashedPin(employee.pin)) {
    try {
      await db.employee.update({ where: { id: employee.id }, data: { pin: hashPin(pin) } });
    } catch { /* non-fatal */ }
  }

  recordSuccess(identifier);
  await purgeExpiredSessions();
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.portalSession.create({ data: { token, employeeId: employee.id, expiresAt } });

  return json({
    token,
    expiresAt,
    role: employee.role,
    employee: {
      id: employee.id,
      employeeNo: employee.employeeNo,
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      role: employee.role,
    },
  });
}
