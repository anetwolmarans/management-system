// Operations overview — aggregated dashboard for the owner.
// Pulls complaints, compliments, inspections, fleet summary, and
// scheduled work (factory reports + maintenance schedules) in one call.
import { db } from "@/lib/db";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86400000);

  const [
    complaints,
    compliments,
    recentInspections,
    vehicles,
    upcomingSchedules,
    upcomingFactoryReports,
    overdueServices,
  ] = await Promise.all([
    db.complaint.findMany({
      where: { type: "complaint" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { employee: { select: { name: true, employeeNo: true } } },
    }),
    db.complaint.findMany({
      where: { type: "compliment" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { employee: { select: { name: true, employeeNo: true } } },
    }),
    db.vehicleInspection.findMany({
      orderBy: { date: "desc" },
      take: 8,
      include: { vehicle: { select: { plateNumber: true, brand: true, model: true } }, inspector: { select: { name: true } } },
    }),
    db.vehicle.findMany({ select: { id: true, status: true, plateNumber: true, brand: true, model: true } }),
    db.maintenanceSchedule.findMany({
      where: { nextDueDate: { gte: now, lte: weekAhead } },
      orderBy: { nextDueDate: "asc" },
      take: 10,
      include: { vehicle: { select: { plateNumber: true, brand: true, model: true } } },
    }),
    db.factoryReport.findMany({
      where: { reportDate: { gte: now } },
      orderBy: { reportDate: "asc" },
      take: 10,
    }),
    db.serviceRecord.findMany({
      where: { date: { lt: now } },
      orderBy: { date: "desc" },
      take: 10,
      include: { vehicle: { select: { plateNumber: true, brand: true, model: true } } },
    }),
  ]);

  const complaintStats = {
    open: complaints.filter((c) => c.status === "open").length,
    investigating: complaints.filter((c) => c.status === "investigating").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    total: complaints.length,
  };
  const complimentStats = {
    total: compliments.length,
    thisWeek: compliments.filter((c) => new Date(c.createdAt) > new Date(now.getTime() - 7 * 86400000)).length,
  };
  const inspectionStats = {
    total: recentInspections.length,
    flagged: recentInspections.filter((i) => i.flagged).length,
    fail: recentInspections.filter((i) => i.overallStatus === "fail").length,
    warning: recentInspections.filter((i) => i.overallStatus === "warning").length,
  };
  const fleetStats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === "active").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
    retired: vehicles.filter((v) => v.status === "retired").length,
  };

  return json({
    complaints: complaints.slice(0, 5),
    compliments: compliments.slice(0, 5),
    complaintStats,
    complimentStats,
    inspections: recentInspections.slice(0, 5),
    inspectionStats,
    fleetStats,
    scheduledJobs: [
      ...upcomingSchedules.map((s) => ({
        type: "maintenance",
        date: s.nextDueDate ?? now,
        title: `${s.task} — ${s.vehicle?.plateNumber ?? "Unassigned"}`,
        vehicle: s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model}` : null,
      })),
      ...upcomingFactoryReports.map((r) => ({
        type: "factory-report",
        date: r.reportDate,
        title: r.title ?? r.compiledFor ?? "Site report",
        vehicle: null,
      })),
    ],
    overdueServices: overdueServices.slice(0, 5).map((s) => ({
      ...s,
      description: s.description,
      serviceType: s.type,
    })),
  });
}
