// Employee-app payslip list with query filters (year / month / search).
// Scoped to the signed-in employee via the portal session token.
import { db } from "@/lib/db";
import { json, err } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);
  const employeeId = auth.employee.id;

  const { searchParams } = new URL(req.url);

  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const where: Record<string, unknown> = { employeeId };
  if (year && year !== "all") where.year = parseInt(year, 10);
  if (month && month !== "all") where.month = parseInt(month, 10);
  if (q) where.periodLabel = { contains: q };

  const slips = await db.payslip.findMany({
    where,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // parse items JSON for each slip
  const out = slips.map((s) => {
    let lines: unknown[] = [];
    try {
      lines = JSON.parse(s.items);
    } catch {
      lines = [];
    }
    const { items: _items, ...rest } = s;
    return { ...rest, lines };
  });

  return json(out);
}
