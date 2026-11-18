// Employee-app home summary — profile, latest payslip, leave status.
// Scoped to the signed-in employee via the portal session token.
import { db } from "@/lib/db";
import { json, err } from "@/lib/api";
import { authenticatePortal } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticatePortal(req);
  if (!auth) return err("Not signed in", 401);
  const employeeId = auth.employee.id;

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { loans: { orderBy: { issuedAt: "desc" } } },
  });
  if (!employee) return err("Employee not found", 404);

  const [latestPayslip, leaves, payslipCount, ytdSlips] = await Promise.all([
    db.payslip.findFirst({
      where: { employeeId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    db.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.payslip.count({ where: { employeeId } }),
    db.payslip.findMany({ where: { employeeId, year: new Date().getFullYear() } }),
  ]);

  const pendingLeave = leaves.filter((l) => l.status === "pending").length;
  const approvedLeave = leaves.filter((l) => l.status === "approved").length;

  // Upcoming / current leave = nearest request that is pending or approved and not past
  const now = new Date();
  const currentLeave =
    leaves
      .filter((l) => l.status !== "rejected" && new Date(l.endDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] ?? null;

  return json({
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
    latestPayslip,
    stats: {
      payslipCount,
      pendingLeave,
      approvedLeave,
      ytdGross: ytdSlips.reduce((a, s) => a + s.gross, 0),
      ytdNet: ytdSlips.reduce((a, s) => a + s.net, 0),
      activeLoan: employee.loans.find((l) => l.status === "active") ?? null,
      annualAllowance: 21,
    },
    currentLeave,
    recentLeave: leaves.slice(0, 4),
  });
}
