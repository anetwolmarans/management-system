// Employee-app portal logout — revokes the current session server-side.
import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  const auth = await authenticatePortal(req);
  if (auth) {
    await db.portalSession.delete({ where: { id: auth.sessionId } }).catch(() => undefined);
  }
  return json({ ok: true });
}
