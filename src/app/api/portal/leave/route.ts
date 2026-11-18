// Employee-app leave list — shows approval status of each request.
import { db } from "@/lib/db";
import { json, err } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") ?? "";
  if (!employeeId) return err("employeeId is required", 422);

  const leaves = await db.leaveRequest.findMany({
    where: { employeeId },
    orderBy: [{ startDate: "desc" }],
    take: 50,
  });
  return json(leaves);
}
