// Dashboard aggregate endpoint.
import { db } from "@/lib/db";
import { json } from "@/lib/api";

export async function GET() {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [
    employees,
    activeLoans,
    pendingLeave,
    openComplaints,
    vehicles,
    todayTimesheets,
    weekLogs,
    weekReports,
    last4WeeksComplaints,
    allLeave,
    allComplaints,
  ] = await Promise.all([
    db.employee.findMany(),
    db.loan.findMany({ where: { status: "active" } }),
    db.leaveRequest.findMany({ where: { status: "pending" }, include: { employee: true } }),
    db.complaint.findMany({ where: { status: { in: ["open", "investigating"] } }, include: { employee: true } }),
    db.vehicle.findMany(),
    db.timesheet.findMany({ where: { date: { gte: todayStart } }, include: { employee: true } }),
    db.fleetLog.findMany({ where: { date: { gte: weekAgo } }, include: { vehicle: true } }),
    db.weeklyReport.findMany({ orderBy: { weekStart: "desc" }, take: 4 }),
    db.complaint.findMany({ where: { createdAt: { gte: weekAgo } } }),
    db.leaveRequest.findMany(),
    db.complaint.findMany(),
  ]);

  const totalLoanBalance = activeLoans.reduce((s, l) => s + l.balance, 0);
  const totalHoursToday = todayTimesheets.reduce((s, t) => s + t.hours, 0);
  const totalFleetDistanceWeek = weekLogs.reduce((s, l) => s + l.distance, 0);
  const totalFuelCostWeek = weekLogs.reduce((s, l) => s + l.fuelCost, 0);

  // Hours-by-day series (last 7 days)
  const hoursByDay: { label: string; hours: number }[] = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const dayHours = await db.timesheet.aggregate({
      where: { date: { gte: day, lt: next } },
      _sum: { hours: true },
    });
    hoursByDay.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      hours: Math.round((dayHours._sum.hours ?? 0) * 10) / 10,
    });
  }

  // Department distribution
  const deptMap: Record<string, number> = {};
  for (const e of employees) deptMap[e.department] = (deptMap[e.department] ?? 0) + 1;
  const departmentDist = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

  // Leave-by-type
  const leaveByTypeMap: Record<string, number> = {};
  for (const l of allLeave) leaveByTypeMap[l.type] = (leaveByTypeMap[l.type] ?? 0) + 1;
  const leaveByType = Object.entries(leaveByTypeMap).map(([name, value]) => ({ name, value }));

  // Complaint by category
  const complaintByCatMap: Record<string, number> = {};
  for (const c of allComplaints) complaintByCatMap[c.category] = (complaintByCatMap[c.category] ?? 0) + 1;
  const complaintByCategory = Object.entries(complaintByCatMap).map(([name, value]) => ({ name, value }));

  return json({
    kpis: {
      employees: employees.length,
      activeEmployees: employees.filter((e) => e.status === "active").length,
      onLeave: employees.filter((e) => e.status === "on-leave").length,
      pendingLeave: pendingLeave.length,
      openComplaints: openComplaints.length,
      criticalComplaints: openComplaints.filter((c) => c.priority === "critical").length,
      activeLoans: activeLoans.length,
      totalLoanBalance,
      vehicles: vehicles.length,
      activeVehicles: vehicles.filter((v) => v.status === "active").length,
      vehiclesInMaintenance: vehicles.filter((v) => v.status === "maintenance").length,
      hoursToday: Math.round(totalHoursToday * 10) / 10,
      fleetTripsWeek: weekLogs.length,
      fleetDistanceWeek: totalFleetDistanceWeek,
      fuelCostWeek: Math.round(totalFuelCostWeek * 100) / 100,
      newComplaintsWeek: last4WeeksComplaints.length,
    },
    charts: {
      hoursByDay,
      departmentDist,
      leaveByType,
      complaintByCategory,
      weeklyTrend: weekReports
        .map((r) => ({
          label: r.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          hours: r.totalHours,
          trips: r.fleetTrips,
          complaintsOpen: r.complaintsOpen,
          complaintsResolved: r.complaintsResolved,
        }))
        .reverse(),
    },
    recentReports: weekReports.slice(0, 3),
    recentComplaints: openComplaints.slice(0, 5),
    pendingLeaveList: pendingLeave.slice(0, 5),
  });
}
