// Employee-app portal login — employee number or email + PIN.
// Creates a server-side session and returns a bearer token for subsequent calls.
//
// Security:
//   • PINs are verified against a scrypt hash (with progressive upgrade
//     for legacy plaintext values — re-hashed on first successful login).
//   • Login attempts are rate-limited per identifier (5 failures within
//     15 minutes triggers a 15-minute lockout).
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

  if (!identifier || !pin) return err("Employee number / email and PIN are required", 422);

  // Rate limit BEFORE touching the DB — prevents brute-force enumeration.
  const limit = checkRateLimit(identifier);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterSec / 60);
    return err(
      `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
      429,
    );
  }

  const employee = await db.employee.findFirst({
    where: {
      OR: [{ employeeNo: identifier.toUpperCase() }, { email: identifier.toLowerCase() }],
    },
  });

  // Same error message for "no such employee" and "wrong PIN" so an
  // attacker can't distinguish the two (no user enumeration).
  const GENERIC = "Invalid credentials. Check your employee number and PIN.";

  if (!employee || !verifyPin(pin, employee.pin)) {
    recordFailure(identifier);
    return err(GENERIC, 401);
  }

  if (employee.status === "terminated") {
    return err("This account is no longer active. Contact HR.", 403);
  }

  // Progressive upgrade: if the stored PIN was plaintext, re-hash it now.
  if (!isHashedPin(employee.pin)) {
    try {
      await db.employee.update({
        where: { id: employee.id },
        data: { pin: hashPin(pin) },
      });
    } catch {
      // Non-fatal — the login still succeeds; we'll retry on next login.
    }
  }

  recordSuccess(identifier);
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
