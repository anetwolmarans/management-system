// Employee-app portal login — employee number, phone, or email + PIN.
// Accepts several identifier forms for easier sign-in:
//   • Full employee number:  "MS-1002"
//   • Short numeric code:    "1002"        (matches any "*-1002")
//   • Phone number:          "+1 555 0102" (normalized digit comparison)
//   • Email:                 "name@company.com"
// Creates a server-side session and returns a bearer token.
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

  if (!identifier || !pin) return err("Enter your employee number, phone, or email and your PIN.", 422);

  // Rate limit BEFORE touching the DB — prevents brute-force enumeration.
  const limit = checkRateLimit(identifier);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterSec / 60);
    return err(
      `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
      429,
    );
  }

  // Build lookup conditions from whatever the user typed.
  const isAllDigits = /^\d+$/.test(identifier);
  const orConditions = [
    { employeeNo: identifier.toUpperCase() },
    { email: identifier.toLowerCase() },
    { phone: identifier },
  ];
  // Short numeric code: "1002" matches employeeNo ending in "-1002".
  if (isAllDigits) {
    orConditions.push({ employeeNo: { endsWith: `-${identifier}` } });
  }

  let employee = await db.employee.findFirst({ where: { OR: orConditions } });

  // Fallback: normalized phone comparison (strip non-digits from both sides)
  // so "+1 555 0102", "5550102", "(+1) 555-0102" all match.
  if (!employee) {
    const digitsOnly = identifier.replace(/[^0-9]/g, "");
    if (digitsOnly.length >= 7) {
      const candidates = await db.employee.findMany({
        where: { phone: { not: null } },
      });
      employee =
        candidates.find((e) => {
          const normalized = (e.phone ?? "").replace(/[^0-9]/g, "");
          return normalized !== "" && normalized === digitsOnly;
        }) ?? null;
    }
  }

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
