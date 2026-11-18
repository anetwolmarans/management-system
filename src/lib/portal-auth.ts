// Employee App server-side session auth.
// The portal client stores a session token (returned by /api/portal/login) and
// presents it as `Authorization: Bearer <token>`. Every /api/portal/* route
// resolves the signed-in employee from this token — the client never gets to
// choose whose data it reads.
import crypto from "crypto";
import { db } from "@/lib/db";

export const SESSION_DAYS = 30;

export type PortalAuth = {
  employee: {
    id: string;
    employeeNo: string;
    name: string;
    email: string;
    phone: string | null;
    position: string;
    department: string;
    hireDate: Date;
    salary: number;
    status: string;
  };
  sessionId: string;
};

function extractToken(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/**
 * Resolves the signed-in employee from the request's bearer token.
 * Returns null when the token is missing, unknown or expired (expired
 * sessions are cleaned up on sight).
 */
export async function authenticatePortal(req: Request): Promise<PortalAuth | null> {
  const token = extractToken(req);
  if (!token) return null;

  const session = await db.portalSession.findUnique({
    where: { token },
    include: { employee: true },
  });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await db.portalSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.employee.status === "terminated") return null;

  return { employee: session.employee, sessionId: session.id };
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Removes expired sessions — called on login to keep the table tidy. */
export async function purgeExpiredSessions(): Promise<void> {
  await db.portalSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
}
