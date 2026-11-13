// Seed script — populate the database with realistic sample data for demo.
import { db } from "../src/lib/db";

async function main() {
  // Wipe existing data so re-seeding is idempotent.
  await db.setting.deleteMany();
  await db.sheet.deleteMany();
  await db.weeklyReport.deleteMany();
  await db.fleetLog.deleteMany();
  await db.vehicle.deleteMany();
  await db.loan.deleteMany();
  await db.complaint.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.timesheet.deleteMany();
  await db.employee.deleteMany();

  // ---------- Employees ----------
  const employees = [
    { name: "Sarah Chen", email: "sarah.chen@workhub.app", phone: "+1 555 0101", position: "Operations Manager", department: "Operations", salary: 8200 },
    { name: "Marcus Reyes", email: "marcus.reyes@workhub.app", phone: "+1 555 0102", position: "Driver", department: "Logistics", salary: 3400 },
    { name: "Priya Patel", email: "priya.patel@workhub.app", phone: "+1 555 0103", position: "Sales Rep", department: "Sales", salary: 4200 },
    { name: "David Okafor", email: "david.okafor@workhub.app", phone: "+1 555 0104", position: "Field Technician", department: "Engineering", salary: 5100 },
    { name: "Emma Lindqvist", email: "emma.l@workhub.app", phone: "+1 555 0105", position: "HR Specialist", department: "HR", salary: 4800 },
    { name: "Tom Bradley", email: "tom.bradley@workhub.app", phone: "+1 555 0106", position: "Driver", department: "Logistics", salary: 3300 },
    { name: "Lena Fischer", email: "lena.fischer@workhub.app", phone: "+1 555 0107", position: "Accountant", department: "Finance", salary: 5600 },
    { name: "Carlos Mendoza", email: "carlos.m@workhub.app", phone: "+1 555 0108", position: "Dispatcher", department: "Operations", salary: 3900 },
    { name: "Aisha Khan", email: "aisha.khan@workhub.app", phone: "+1 555 0109", position: "Sales Rep", department: "Sales", salary: 4400 },
    { name: "Robert Liu", email: "robert.liu@workhub.app", phone: "+1 555 0110", position: "Engineer", department: "Engineering", salary: 7200 },
    { name: "Nina Petrova", email: "nina.p@workhub.app", phone: "+1 555 0111", position: "Driver", department: "Logistics", salary: 3350 },
    { name: "James O'Brien", email: "james.ob@workhub.app", phone: "+1 555 0112", position: "Field Technician", department: "Engineering", salary: 4950 },
  ];

  const createdEmployees = [];
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const emp = await db.employee.create({
      data: {
        employeeNo: `WH-${String(1001 + i).padStart(4, "0")}`,
        name: e.name,
        email: e.email,
        phone: e.phone,
        position: e.position,
        department: e.department,
        hireDate: new Date(2021, (i * 3) % 12, (i * 7) % 28 + 1),
        salary: e.salary,
        status: i === 11 ? "on-leave" : "active",
        avatar: null,
      },
    });
    createdEmployees.push(emp);
  }

  // ---------- Timesheets (last 7 days) ----------
  const today = new Date();
  for (let d = 6; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(today.getDate() - d);
    if (day.getDay() === 0) continue;
    for (const emp of createdEmployees) {
      if (emp.status !== "active") continue;
      if (Math.random() < 0.2) continue;
      const inH = 8 + Math.floor(Math.random() * 2);
      const inM = Math.floor(Math.random() * 30);
      const clockIn = new Date(day);
      clockIn.setHours(inH, inM, 0, 0);
      const outH = 17 + Math.floor(Math.random() * 2);
      const outM = Math.floor(Math.random() * 45);
      const clockOut = new Date(day);
      clockOut.setHours(outH, outM, 0, 0);
      const hours = (clockOut.getTime() - clockIn.getTime()) / 3600000 - 0.5;
      await db.timesheet.create({
        data: {
          employeeId: emp.id,
          date: day,
          clockIn,
          clockOut,
          breakMin: 30,
          hours: Math.round(hours * 100) / 100,
          status: d === 0 ? "pending" : Math.random() < 0.9 ? "approved" : "pending",
        },
      });
    }
  }

  // ---------- Leave Requests ----------
  const leaveTypes = ["annual", "sick", "unpaid", "emergency", "maternity"];
  for (let i = 0; i < 8; i++) {
    const emp = createdEmployees[i % createdEmployees.length];
    const start = new Date(today);
    start.setDate(today.getDate() + (i - 4) * 3);
    const end = new Date(start);
    end.setDate(start.getDate() + (i % 3) + 1);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    await db.leaveRequest.create({
      data: {
        employeeId: emp.id,
        type: leaveTypes[i % leaveTypes.length],
        startDate: start,
        endDate: end,
        days,
        reason: ["Family vacation", "Medical appointment", "Personal matter", "Childcare", "Recovery"][i % 5],
        status: i < 3 ? "pending" : i < 6 ? "approved" : "rejected",
      },
    });
  }

  // ---------- Complaints ----------
  const complaintTemplates = [
    { title: "Late salary deposit", category: "payment", priority: "high", description: "Salary for last month arrived 5 days late, causing financial strain." },
    { title: "Forklift safety concern in warehouse B", category: "safety", priority: "critical", description: "The forklift in warehouse B has faulty brakes — near-miss incident reported yesterday." },
    { title: "Workload imbalance in dispatch", category: "workload", priority: "medium", description: "Night shift dispatch handles 60% more tickets than day shift with same headcount." },
    { title: "Inappropriate comment from coworker", category: "harassment", priority: "high", description: "Repeated inappropriate remarks during team meetings despite verbal warnings." },
    { title: "Outdated laptops for engineering team", category: "equipment", priority: "low", description: "Engineering team laptops are 4+ years old, slowing down compile times significantly." },
    { title: "Missing PPE at site C", category: "safety", priority: "high", description: "Hard hats and high-vis vests are out of stock at site C storage room." },
    { title: "Confusing expense reimbursement process", category: "other", priority: "low", description: "The expense form has 12 fields and three approval steps — too complex." },
  ];
  for (let i = 0; i < complaintTemplates.length; i++) {
    const t = complaintTemplates[i];
    const emp = createdEmployees[i % createdEmployees.length];
    const created = new Date(today);
    created.setDate(today.getDate() - (i + 1) * 2);
    const isResolved = i >= 4;
    await db.complaint.create({
      data: {
        employeeId: emp.id,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: isResolved ? "resolved" : i < 2 ? "investigating" : "open",
        resolution: isResolved ? "Issue addressed — corrective action taken and documented in HR file." : null,
        createdAt: created,
        resolvedAt: isResolved ? new Date(created.getTime() + 86400000 * 2) : null,
      },
    });
  }

  // ---------- Loans ----------
  const loanTerms = [6, 12, 12, 24, 6, 12];
  for (let i = 0; i < 6; i++) {
    const emp = createdEmployees[i];
    const principal = [3000, 5000, 2500, 8000, 1500, 6000][i];
    const termMonths = loanTerms[i];
    const interestRate = 0.05;
    const monthlyPayment = (principal * (1 + interestRate)) / termMonths;
    const paidMonths = Math.floor(Math.random() * (termMonths - 1)) + 1;
    const balance = Math.round((monthlyPayment * (termMonths - paidMonths)) * 100) / 100;
    const issued = new Date(today);
    issued.setMonth(today.getMonth() - paidMonths);
    await db.loan.create({
      data: {
        employeeId: emp.id,
        principal,
        interestRate,
        termMonths,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        balance,
        status: balance <= 0 ? "paid" : "active",
        issuedAt: issued,
      },
    });
  }

  // ---------- Vehicles ----------
  const vehicles = [
    { plateNumber: "WH-101-A", brand: "Ford", model: "Transit", year: 2022, type: "van", assignedTo: "Marcus Reyes", mileage: 48230, fuelLevel: 75 },
    { plateNumber: "WH-102-B", brand: "Mercedes", model: "Sprinter", year: 2023, type: "van", assignedTo: "Tom Bradley", mileage: 21340, fuelLevel: 60 },
    { plateNumber: "WH-103-C", brand: "Isuzu", model: "NPR", year: 2021, type: "truck", assignedTo: null, mileage: 92110, fuelLevel: 40 },
    { plateNumber: "WH-104-D", brand: "Toyota", model: "Hilux", year: 2024, type: "truck", assignedTo: "Nina Petrova", mileage: 8900, fuelLevel: 90 },
    { plateNumber: "WH-105-E", brand: "Volkswagen", model: "Caddy", year: 2020, type: "van", assignedTo: null, mileage: 124500, fuelLevel: 25 },
    { plateNumber: "WH-106-F", brand: "Honda", model: "PCX", year: 2023, type: "motorcycle", assignedTo: "Carlos Mendoza", mileage: 5600, fuelLevel: 80 },
    { plateNumber: "WH-107-G", brand: "Ford", model: "Ranger", year: 2022, type: "truck", assignedTo: "James O'Brien", mileage: 31200, fuelLevel: 55 },
  ];
  const createdVehicles = [];
  for (const v of vehicles) {
    const veh = await db.vehicle.create({
      data: {
        plateNumber: v.plateNumber,
        brand: v.brand,
        model: v.model,
        year: v.year,
        type: v.type,
        status: v.fuelLevel < 30 ? "maintenance" : "active",
        assignedTo: v.assignedTo,
        mileage: v.mileage,
        fuelLevel: v.fuelLevel,
      },
    });
    createdVehicles.push(veh);
  }

  // ---------- Fleet Logs (last 14 days) ----------
  const purposes = ["Delivery run", "Customer visit", "Equipment transport", "Site inspection", "Maintenance trip", "Fuel top-up"];
  const driverMap: Record<string, string> = {};
  createdVehicles.forEach((v, idx) => {
    driverMap[v.id] = createdEmployees[idx % createdEmployees.length].id;
  });
  for (let d = 13; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(today.getDate() - d);
    if (day.getDay() === 0) continue;
    for (const veh of createdVehicles) {
      if (Math.random() < 0.3) continue;
      const startOdo = veh.mileage - Math.floor(Math.random() * 200);
      const distance = 20 + Math.floor(Math.random() * 180);
      const endOdo = startOdo + distance;
      await db.fleetLog.create({
        data: {
          vehicleId: veh.id,
          employeeId: driverMap[veh.id],
          date: day,
          startOdometer: startOdo,
          endOdometer: endOdo,
          distance,
          fuelCost: Math.round((distance * 0.12) * 100) / 100,
          purpose: purposes[Math.floor(Math.random() * purposes.length)],
        },
      });
    }
  }

  // ---------- Weekly Reports ----------
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7 * (w + 1));
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const totalHours = 320 + Math.floor(Math.random() * 80);
    await db.weeklyReport.create({
      data: {
        weekStart,
        weekEnd,
        title: `Weekly Operations Report — Week of ${weekStart.toLocaleDateString()}`,
        summary: `Team maintained ${totalHours} productive hours across operations. Fleet completed ${15 + w * 2} trips totalling ${1200 + w * 180} km. Two new complaints filed and ${3 - Math.floor(w / 2)} resolved. Loan portfolio remained stable with no defaults.`,
        totalEmployees: createdEmployees.length,
        totalHours,
        complaintsOpen: Math.max(0, 3 - w),
        complaintsResolved: 2 + Math.floor(Math.random() * 3),
        leaveDays: 4 + Math.floor(Math.random() * 6),
        fleetTrips: 15 + w * 2,
        fleetDistance: 1200 + w * 180,
        loansActive: 6,
        authoredById: createdEmployees[0].id,
      },
    });
  }

  // ---------- Sheets ----------
  const projectSheetColumns = JSON.stringify([
    { id: "c1", name: "Task", type: "text" },
    { id: "c2", name: "Owner", type: "text" },
    { id: "c3", name: "Status", type: "select", options: ["Not Started", "In Progress", "Blocked", "Done"] },
    { id: "c4", name: "Due Date", type: "date" },
    { id: "c5", name: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
    { id: "c6", name: "% Complete", type: "number" },
  ]);
  const projectSheetRows = JSON.stringify([
    { c1: "Roll out PWA build to Play Store", c2: "Robert Liu", c3: "In Progress", c4: "2026-11-20", c5: "High", c6: 60 },
    { c1: "Q4 safety audit — warehouse B", c2: "Sarah Chen", c3: "Not Started", c4: "2026-11-25", c5: "Critical", c6: 0 },
    { c1: "Renegotiate fuel supplier contract", c2: "Lena Fischer", c3: "In Progress", c4: "2026-12-01", c5: "Medium", c6: 35 },
    { c1: "Driver training refresher — batch 2", c2: "Emma Lindqvist", c3: "Blocked", c4: "2026-11-18", c5: "Medium", c6: 20 },
    { c1: "Replace legacy dispatch software", c2: "Carlos Mendoza", c3: "Done", c4: "2026-11-05", c5: "High", c6: 100 },
    { c1: "Onboard 3 new field technicians", c2: "Emma Lindqvist", c3: "In Progress", c4: "2026-11-22", c5: "Low", c6: 50 },
    { c1: "Year-end inventory reconciliation", c2: "Lena Fischer", c3: "Not Started", c4: "2026-12-15", c5: "High", c6: 0 },
    { c1: "Customer NPS survey — November", c2: "Priya Patel", c3: "In Progress", c4: "2026-11-30", c5: "Low", c6: 75 },
  ]);
  await db.sheet.create({
    data: {
      name: "Operations Project Tracker",
      description: "Cross-team initiative tracker — owner, status, due date, priority.",
      columns: projectSheetColumns,
      rows: projectSheetRows,
    },
  });

  const assetSheetColumns = JSON.stringify([
    { id: "c1", name: "Asset", type: "text" },
    { id: "c2", name: "Serial", type: "text" },
    { id: "c3", name: "Assigned To", type: "text" },
    { id: "c4", name: "Location", type: "text" },
    { id: "c5", name: "Condition", type: "select", options: ["New", "Good", "Fair", "Poor"] },
    { id: "c6", name: "Value", type: "number" },
  ]);
  const assetSheetRows = JSON.stringify([
    { c1: "MacBook Pro 16", c2: "MBP-2201", c3: "Robert Liu", c4: "HQ — Engineering", c5: "Good", c6: 2800 },
    { c1: "Forklift Toyota 8FG", c2: "FL-301", c3: "Warehouse B", c4: "Warehouse B", c5: "Fair", c6: 18000 },
    { c1: "iPad Pro 11", c2: "IPD-410", c3: "Priya Patel", c4: "Sales", c5: "New", c6: 1100 },
    { c1: "Scan-gun Zebra TC52", c2: "ZN-9001", c3: "Marcus Reyes", c4: "Logistics", c5: "Good", c6: 850 },
    { c1: "Workshop compressor", c2: "WC-12", c3: "Site C", c4: "Site C", c5: "Poor", c6: 1500 },
  ]);
  await db.sheet.create({
    data: {
      name: "Asset Register",
      description: "Company-owned assets — laptops, equipment, vehicles and tools.",
      columns: assetSheetColumns,
      rows: assetSheetRows,
    },
  });

  // ---------- Settings ----------
  await db.setting.create({ data: { key: "company.name", value: "WorkHub Demo Co." } });
  await db.setting.create({ data: { key: "company.currency", value: "USD" } });
  await db.setting.create({ data: { key: "leave.annual.allowance", value: "21" } });

  console.log("Seed completed");
  console.log(`  Employees: ${createdEmployees.length}`);
  console.log(`  Vehicles: ${createdVehicles.length}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
