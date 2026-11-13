import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export async function GET() {
  const reports = await db.weeklyReport.findMany({
    orderBy: { weekStart: "desc" },
    include: { authoredBy: true },
    take: 100,
  });
  return json(reports);
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  // Auto-generate a weekly report from current data
  const now = new Date();
  const weekStart = body.weekStart
    ? new Date(body.weekStart as string)
    : (() => {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setDate(d.getDate() - d.getDay() + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      })();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const [employees, timesheets, leave, complaints, fleetLogs, loans] = await Promise.all([
    db.employee.findMany(),
    db.timesheet.findMany({ where: { date: { gte: weekStart, lte: weekEnd } } }),
    db.leaveRequest.findMany({ where: { startDate: { gte: weekStart, lte: weekEnd } } }),
    db.complaint.findMany({ where: { createdAt: { gte: weekStart, lte: weekEnd } } }),
    db.fleetLog.findMany({ where: { date: { gte: weekStart, lte: weekEnd } } }),
    db.loan.findMany({ where: { status: "active" } }),
  ]);

  const totalHours = Math.round(timesheets.reduce((s, t) => s + t.hours, 0) * 10) / 10;
  const fleetDistance = fleetLogs.reduce((s, l) => s + l.distance, 0);
  const leaveDays = Math.round(leave.reduce((s, l) => s + l.days, 0) * 10) / 10;
  const complaintsOpen = complaints.filter((c) => c.status === "open" || c.status === "investigating").length;
  const complaintsResolved = complaints.filter((c) => c.status === "resolved").length;

  const title = body.title ?? `Weekly Operations Report — Week of ${weekStart.toLocaleDateString()}`;
  const summary =
    body.summary ??
    `Team maintained ${totalHours} productive hours across operations. ` +
      `Fleet completed ${fleetLogs.length} trips totalling ${fleetDistance} km. ` +
      `${complaints.length} complaints filed, ${complaintsResolved} resolved. ` +
      `Leave taken: ${leaveDays} days. Loan portfolio: ${loans.length} active loans with outstanding balance of $${loans
        .reduce((s, l) => s + l.balance, 0)
        .toFixed(2)}.`;

  const report = await db.weeklyReport.create({
    data: {
      weekStart,
      weekEnd,
      title,
      summary,
      totalEmployees: employees.length,
      totalHours,
      complaintsOpen,
      complaintsResolved,
      leaveDays,
      fleetTrips: fleetLogs.length,
      fleetDistance,
      loansActive: loans.length,
      authoredById: (body.authoredById as string) ?? null,
    },
    include: { authoredBy: true },
  });
  return json(report, 201);
}
