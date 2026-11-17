// Seed script — populate the database with realistic sample data for demo.
import { db } from "../src/lib/db";

async function main() {
  // Wipe existing data so re-seeding is idempotent.
  await db.factoryReport.deleteMany();
  await db.maintenanceSchedule.deleteMany();
  await db.serviceRecord.deleteMany();
  await db.vehicleInspection.deleteMany();
  await db.setting.deleteMany();
  await db.sheet.deleteMany();
  await db.formSubmission.deleteMany();
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
    { name: "Sarah Chen", email: "sarah.chen@baywashgroup.com", phone: "+1 555 0101", position: "Operations Manager", department: "Operations", salary: 8200 },
    { name: "Marcus Reyes", email: "marcus.reyes@baywashgroup.com", phone: "+1 555 0102", position: "Driver", department: "Logistics", salary: 3400 },
    { name: "Priya Patel", email: "priya.patel@baywashgroup.com", phone: "+1 555 0103", position: "Sales Rep", department: "Sales", salary: 4200 },
    { name: "David Okafor", email: "david.okafor@baywashgroup.com", phone: "+1 555 0104", position: "Field Technician", department: "Engineering", salary: 5100 },
    { name: "Emma Lindqvist", email: "emma.l@baywashgroup.com", phone: "+1 555 0105", position: "HR Specialist", department: "HR", salary: 4800 },
    { name: "Tom Bradley", email: "tom.bradley@baywashgroup.com", phone: "+1 555 0106", position: "Driver", department: "Logistics", salary: 3300 },
    { name: "Lena Fischer", email: "lena.fischer@baywashgroup.com", phone: "+1 555 0107", position: "Accountant", department: "Finance", salary: 5600 },
    { name: "Carlos Mendoza", email: "carlos.m@baywashgroup.com", phone: "+1 555 0108", position: "Dispatcher", department: "Operations", salary: 3900 },
    { name: "Aisha Khan", email: "aisha.khan@baywashgroup.com", phone: "+1 555 0109", position: "Sales Rep", department: "Sales", salary: 4400 },
    { name: "Robert Liu", email: "robert.liu@baywashgroup.com", phone: "+1 555 0110", position: "Engineer", department: "Engineering", salary: 7200 },
    { name: "Nina Petrova", email: "nina.p@baywashgroup.com", phone: "+1 555 0111", position: "Driver", department: "Logistics", salary: 3350 },
    { name: "James O'Brien", email: "james.ob@baywashgroup.com", phone: "+1 555 0112", position: "Field Technician", department: "Engineering", salary: 4950 },
  ];

  const createdEmployees = [];
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const emp = await db.employee.create({
      data: {
        employeeNo: `BW-${String(1001 + i).padStart(4, "0")}`,
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

  // ---------- Vehicles (with purchase data) ----------
  const vehicles = [
    { plateNumber: "BW-101-A", brand: "Ford", model: "Transit", year: 2022, type: "van", assignedTo: "Marcus Reyes", mileage: 48230, fuelLevel: 75,
      vin: "1FTBR1X8XNKA12345", purchasePrice: 42000, purchaseDate: new Date(2022, 2, 14), supplier: "City Ford Dealership", color: "White",
      insuranceExpiry: new Date(2027, 2, 14), registrationExpiry: new Date(2027, 5, 30) },
    { plateNumber: "BW-102-B", brand: "Mercedes", model: "Sprinter", year: 2023, type: "van", assignedTo: "Tom Bradley", mileage: 21340, fuelLevel: 60,
      vin: "WD3PE8CC8P5123456", purchasePrice: 58000, purchaseDate: new Date(2023, 5, 1), supplier: "Star Motors", color: "Silver",
      insuranceExpiry: new Date(2027, 5, 1), registrationExpiry: new Date(2027, 8, 15) },
    { plateNumber: "BW-103-C", brand: "Isuzu", model: "NPR", year: 2021, type: "truck", assignedTo: null, mileage: 92110, fuelLevel: 40,
      vin: "JALCD58R670012345", purchasePrice: 78000, purchaseDate: new Date(2021, 0, 20), supplier: "TruckZone Commercial", color: "Yellow",
      insuranceExpiry: new Date(2026, 11, 1), registrationExpiry: new Date(2027, 0, 20) },
    { plateNumber: "BW-104-D", brand: "Toyota", model: "Hilux", year: 2024, type: "truck", assignedTo: "Nina Petrova", mileage: 8900, fuelLevel: 90,
      vin: "AHTKB8CD403123456", purchasePrice: 46000, purchaseDate: new Date(2024, 1, 10), supplier: "Toyota Eastgate", color: "Graphite",
      insuranceExpiry: new Date(2028, 1, 10), registrationExpiry: new Date(2028, 1, 10) },
    { plateNumber: "BW-105-E", brand: "Volkswagen", model: "Caddy", year: 2020, type: "van", assignedTo: null, mileage: 124500, fuelLevel: 25,
      vin: "WVWZZZ2KZAW012345", purchasePrice: 28000, purchaseDate: new Date(2020, 4, 22), supplier: "VW Fleet Sales", color: "Blue",
      insuranceExpiry: new Date(2026, 9, 22), registrationExpiry: new Date(2026, 11, 30) },
    { plateNumber: "BW-106-F", brand: "Honda", model: "PCX", year: 2023, type: "motorcycle", assignedTo: "Carlos Mendoza", mileage: 5600, fuelLevel: 80,
      vin: "JH2MF6500PK001234", purchasePrice: 4800, purchaseDate: new Date(2023, 7, 5), supplier: "Rider Honda", color: "Red",
      insuranceExpiry: new Date(2027, 7, 5), registrationExpiry: new Date(2027, 7, 5) },
    { plateNumber: "BW-107-G", brand: "Ford", model: "Ranger", year: 2022, type: "truck", assignedTo: "James O'Brien", mileage: 31200, fuelLevel: 55,
      vin: "1FTYR14C9NKA12345", purchasePrice: 51000, purchaseDate: new Date(2022, 8, 12), supplier: "City Ford Dealership", color: "Black",
      insuranceExpiry: new Date(2027, 8, 12), registrationExpiry: new Date(2027, 8, 12) },
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
        vin: v.vin,
        purchasePrice: v.purchasePrice,
        purchaseDate: v.purchaseDate,
        supplier: v.supplier,
        color: v.color,
        insuranceExpiry: v.insuranceExpiry,
        registrationExpiry: v.registrationExpiry,
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

  // ---------- Weekly Driver Inspections ----------
  // Standard checklist used for every inspection
  const inspectionChecklistTemplate = [
    { id: "tires", name: "Tires & tread" },
    { id: "brakes", name: "Brakes" },
    { id: "lights", name: "Lights (head/tail/indicators)" },
    { id: "fluids", name: "Fluid levels (oil/coolant/brake)" },
    { id: "wipers", name: "Wipers & washers" },
    { id: "body", name: "Body & mirrors" },
    { id: "seatbelts", name: "Seatbelts" },
    { id: "horn", name: "Horn" },
    { id: "exhaust", name: "Exhaust / emissions" },
    { id: "steering", name: "Steering & suspension" },
  ];

  // Run inspections weekly for the past 4 weeks. Some will randomly fail/warn.
  for (let w = 0; w < 4; w++) {
    const weekOffset = w * 7;
    const inspDate = new Date(today);
    inspDate.setDate(today.getDate() - weekOffset);
    inspDate.setHours(9, 0, 0, 0);

    for (const veh of createdVehicles) {
      if (veh.status === "retired") continue;
      // Skip ~20% randomly to vary density
      if (Math.random() < 0.2 && w > 0) continue;

      // Decide if this inspection flags issues (~25% chance).
      // Deterministic demo hook: the current week (w=0) ALWAYS has one warning
      // (first vehicle) and one fail (second vehicle) so the fleet-controller
      // acknowledgement workflow is demonstrable right after seeding.
      let willFlag = Math.random() < 0.25;
      let forcedStatus: "warning" | "fail" | null = null;
      if (w === 0 && veh.id === createdVehicles[0].id) {
        willFlag = true;
        forcedStatus = "warning";
      } else if (w === 0 && createdVehicles[1] && veh.id === createdVehicles[1].id) {
        willFlag = true;
        forcedStatus = "fail";
      }
      const items = inspectionChecklistTemplate.map((t) => {
        let status: "ok" | "warning" | "fail" = "ok";
        let notes = "";
        if (willFlag && (forcedStatus !== null || Math.random() < 0.35)) {
          status = forcedStatus ?? (Math.random() < 0.4 ? "fail" : "warning");
          const noteMap: Record<string, string> = {
            tires: "Front-left tire tread below 3mm — needs replacement.",
            brakes: "Brake pedal feels soft — possible air in lines.",
            lights: "Reverse light not functioning.",
            fluids: "Brake fluid below MIN mark.",
            wipers: "Driver-side wiper blade torn.",
            body: "Scratch on rear bumper, mirror housing cracked.",
            seatbelts: "Rear middle belt retractor sticky.",
            horn: "Horn intermittent.",
            exhaust: "Visible smoke from exhaust on cold start.",
            steering: "Slight pull to the right under braking.",
          };
          notes = noteMap[t.id] ?? "Needs attention.";
        }
        return { ...t, status, notes };
      });

      const hasFail = items.some((i) => i.status === "fail");
      const hasWarn = items.some((i) => i.status === "warning");
      const overallStatus = hasFail ? "fail" : hasWarn ? "warning" : "pass";
      const flagged = hasFail || hasWarn;

      await db.vehicleInspection.create({
        data: {
          vehicleId: veh.id,
          inspectorId: driverMap[veh.id] ?? null,
          date: inspDate,
          overallStatus,
          flagged,
          acknowledgedBy: flagged && w >= 2 ? "Sarah Chen" : null,
          acknowledgedAt: flagged && w >= 2 ? new Date(inspDate.getTime() + 86400000) : null,
          items: JSON.stringify(items),
          notes: flagged
            ? "Driver reported issues during weekly check — needs fleet controller review."
            : "All checks passed.",
          odoReading: veh.mileage - Math.floor(Math.random() * 200),
        },
      });
    }
  }

  // ---------- Service Records (history per vehicle) ----------
  const serviceTemplates: Array<{ type: string; description: string; task: string; intervalMileage?: number; intervalDays?: number }> = [
    { type: "oil-change", description: "Engine oil & filter change", task: "Oil change", intervalMileage: 15000, intervalDays: 365 },
    { type: "wheel-rotation", description: "Tire rotation — front to rear swap", task: "Wheel rotation", intervalMileage: 10000, intervalDays: 180 },
    { type: "brake-service", description: "Brake pad inspection & cleaning", task: "Brake inspection", intervalMileage: 20000, intervalDays: 365 },
    { type: "tire-replacement", description: "Replaced worn tires", task: "Tire replacement" },
    { type: "battery", description: "Battery replacement", task: "Battery replacement", intervalDays: 1095 },
    { type: "filter", description: "Cabin & air filter replacement", task: "Filter replacement", intervalMileage: 30000 },
    { type: "inspection", description: "Annual safety inspection", task: "Safety inspection", intervalDays: 365 },
  ];

  // Helper: round to 2dp
  const r2 = (n: number) => Math.round(n * 100) / 100;

  for (const veh of createdVehicles) {
    // Generate 3-5 historical service records per vehicle
    const numServices = 3 + Math.floor(Math.random() * 3);
    const used = new Set<number>();
    for (let i = 0; i < numServices; i++) {
      let tplIdx = Math.floor(Math.random() * serviceTemplates.length);
      while (used.has(tplIdx) && used.size < serviceTemplates.length) {
        tplIdx = (tplIdx + 1) % serviceTemplates.length;
      }
      used.add(tplIdx);
      const tpl = serviceTemplates[tplIdx];
      const monthsAgo = Math.floor(Math.random() * 18) + 1;
      const svcDate = new Date(today);
      svcDate.setMonth(today.getMonth() - monthsAgo);
      const svcMileage = Math.max(0, veh.mileage - Math.floor(Math.random() * 30000));
      const partsReplaced: Array<{ name: string; qty: number; cost: number }> = [];
      let cost = 50 + Math.floor(Math.random() * 200);
      if (tpl.type === "oil-change") partsReplaced.push({ name: "Engine oil 5W-30 (5L)", qty: 1, cost: 45 });
      if (tpl.type === "oil-change") partsReplaced.push({ name: "Oil filter", qty: 1, cost: 18 });
      if (tpl.type === "wheel-rotation") partsReplaced.push({ name: "Wheel weights (balance)", qty: 4, cost: 12 });
      if (tpl.type === "tire-replacement") {
        const tireCount = veh.type === "motorcycle" ? 2 : 4;
        partsReplaced.push({ name: "All-season tire", qty: tireCount, cost: 110 * tireCount });
        cost = 100 + tireCount * 110;
      }
      if (tpl.type === "brake-service") partsReplaced.push({ name: "Brake pad set", qty: 2, cost: 65 });
      if (tpl.type === "battery") partsReplaced.push({ name: "Battery 12V 70Ah", qty: 1, cost: 140 });
      if (tpl.type === "filter") partsReplaced.push({ name: "Cabin filter", qty: 1, cost: 22 });
      if (tpl.type === "filter") partsReplaced.push({ name: "Air filter", qty: 1, cost: 28 });
      const partsTotal = partsReplaced.reduce((s, p) => s + p.cost * p.qty, 0);
      cost = r2(cost + partsTotal * 0.1);

      await db.serviceRecord.create({
        data: {
          vehicleId: veh.id,
          type: tpl.type,
          description: tpl.description,
          date: svcDate,
          mileage: svcMileage,
          cost: r2(cost),
          performedById: createdEmployees[7].id, // Carlos Mendoza — dispatcher, also acts as workshop coordinator
          supplier: ["City Auto Workshop", "FleetCare Services", "QuickFix Garage", "Manufacturer Service Centre"][i % 4],
          partsReplaced: JSON.stringify(partsReplaced),
          notes: i === 0 ? "Routine scheduled service." : "",
        },
      });
    }
  }

  // ---------- Maintenance Schedules (recurring) ----------
  // Create schedules per vehicle for: oil change, wheel rotation, brake inspection, safety inspection
  const scheduleTemplates = [
    { task: "Oil change", intervalType: "both", intervalMileage: 15000, intervalDays: 365 },
    { task: "Wheel rotation", intervalType: "mileage", intervalMileage: 10000, intervalDays: null },
    { task: "Brake inspection", intervalType: "mileage", intervalMileage: 20000, intervalDays: null },
    { task: "Safety inspection", intervalType: "time", intervalMileage: null, intervalDays: 365 },
    { task: "Tire condition check", intervalType: "time", intervalMileage: null, intervalDays: 90 },
  ];

  for (const veh of createdVehicles) {
    for (const tpl of scheduleTemplates) {
      // Find last matching service for this vehicle (if any)
      const lastService = await db.serviceRecord.findFirst({
        where: { vehicleId: veh.id, type: tpl.task.toLowerCase().replace(/\s+/g, "-") },
        orderBy: { date: "desc" },
      });
      // Use last service date if available, otherwise assume a recent "synthetic" service
      // so the next due date isn't absurdly far in the past.
      const fallbackDate = new Date(today.getTime() - Math.floor(Math.random() * 200 + 30) * 86400000);
      const lastDate = lastService?.date ?? fallbackDate;
      const lastMileage = lastService?.mileage ?? Math.max(0, veh.mileage - Math.floor(Math.random() * 5000 + 1000));

      // Compute next due — fast-forward past dates by repeating the interval until future
      let nextDueDate: Date | null = null;
      let nextDueMileage: number | null = null;
      if (tpl.intervalDays) {
        nextDueDate = new Date(lastDate);
        nextDueDate.setDate(nextDueDate.getDate() + tpl.intervalDays);
        // Fast-forward until nextDueDate is in the future
        while (nextDueDate.getTime() < today.getTime()) {
          nextDueDate.setDate(nextDueDate.getDate() + tpl.intervalDays);
        }
      }
      if (tpl.intervalMileage) {
        nextDueMileage = lastMileage + tpl.intervalMileage;
        // Fast-forward mileage if already past
        while (nextDueMileage !== null && nextDueMileage < veh.mileage) {
          nextDueMileage += tpl.intervalMileage;
        }
      }

      // Inject ~25% overdue and ~20% due-soon for demo realism
      const roll = Math.random();
      if (roll < 0.25 && nextDueDate) {
        // Override to overdue (1-15 days past)
        nextDueDate = new Date(today.getTime() - Math.floor(Math.random() * 15 + 1) * 86400000);
      } else if (roll < 0.45 && nextDueDate) {
        // Override to due-soon (1-13 days future)
        nextDueDate = new Date(today.getTime() + Math.floor(Math.random() * 13 + 1) * 86400000);
      }
      if (roll < 0.20 && nextDueMileage) {
        // Override to mileage-overdue
        nextDueMileage = veh.mileage - Math.floor(Math.random() * 800 + 50);
      } else if (roll < 0.35 && nextDueMileage) {
        // Due-soon by mileage
        nextDueMileage = veh.mileage + Math.floor(Math.random() * 900 + 100);
      }

      await db.maintenanceSchedule.create({
        data: {
          vehicleId: veh.id,
          task: tpl.task,
          intervalType: tpl.intervalType,
          intervalMileage: tpl.intervalMileage,
          intervalDays: tpl.intervalDays,
          lastPerformedDate: lastDate,
          lastPerformedMileage: lastMileage,
          nextDueDate,
          nextDueMileage,
          notes: "",
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

  // ---------- Daily Factory Reports (multi-site operational reports) ----------
  // Modeled on the BAYWASH CLEANING daily factory report format.
  const factoryReportSections = [
    {
      id: "s1",
      siteName: "HANGANA",
      reporterName: "COETZEE",
      summary: "Cleaning findings discussed with team to rectify. Multiple machinery issues including burned motors and broken OPC.",
      items: [
        { id: "i1", category: "cleaning-findings", description: "Conveyor at packer line was dirty, cleaning was done", actionNeeded: "None — completed", responsiblePerson: "Cleaning Team", status: "resolved" },
        { id: "i2", category: "cleaning-findings", description: "Rust on S/steel poles and sprockets of autoplate", actionNeeded: "Treat rust immediately, schedule descaling", responsiblePerson: "Maintenance Lead", status: "open" },
        { id: "i3", category: "cleaning-findings", description: "All findings discussed with team to rectify", actionNeeded: "Follow up next shift", responsiblePerson: "Coetzee", status: "in-progress" },
        { id: "i4", category: "machinery", description: "Machine fitting spring off — almost injured person", actionNeeded: "URGENT: isolate machine, replace fitting spring", responsiblePerson: "Maintenance Lead", status: "open" },
        { id: "i5", category: "machinery", description: "BWC033 at the workshop (motors burned)", actionNeeded: "Send to workshop for motor rewind", responsiblePerson: "Workshop Supervisor", status: "in-progress" },
        { id: "i6", category: "machinery", description: "OPC needs repairs — system is not working from inside", actionNeeded: "Diagnose OPC fault, order spare parts", responsiblePerson: "Engineering", status: "open" },
        { id: "i7", category: "personnel", description: "Haikali booked off sick", actionNeeded: "Arrange cover for shift", responsiblePerson: "HR", status: "in-progress" },
        { id: "i8", category: "personnel", description: "Teofilus Titus booked off for hand injury", actionNeeded: "File incident report, follow up medical clearance", responsiblePerson: "HR / Safety Officer", status: "open" },
        { id: "i9", category: "personnel", description: "Oiva Katali AWOL", actionNeeded: "Issue formal AWOL notice, disciplinary follow-up", responsiblePerson: "HR", status: "open" },
        { id: "i10", category: "personnel", description: "Site has 1 shortage (in place of Humu)", actionNeeded: "Recruit or transfer from pool", responsiblePerson: "Operations Manager", status: "open" },
        { id: "i11", category: "ppe-equipment", description: "Omankete PPE given to Hangana (Oilskins & gumboots)", actionNeeded: "None — issued", responsiblePerson: "Stores", status: "resolved" },
        { id: "i12", category: "ppe-equipment", description: "Brushware, Oilskins, Socks and PPE ordered — current ones old and torn", actionNeeded: "Expedite delivery, interim issue from stock", responsiblePerson: "Procurement", status: "in-progress" },
        { id: "i13", category: "other", description: "Upi change shifts to work 5 hours on Sundays", actionNeeded: "Update roster, confirm with HR", responsiblePerson: "Operations Manager", status: "in-progress" },
      ],
    },
    {
      id: "s2",
      siteName: "BHL",
      reporterName: "FRANS & COETZEE",
      summary: "Truck and car wash activity. Foamer issues and lighting needs fixing. Leave request pending.",
      items: [
        { id: "i1", category: "cleaning-findings", description: "2 trucks and 1 car washed on 23/06/2026", actionNeeded: "None — completed", responsiblePerson: "BHL Team", status: "resolved" },
        { id: "i2", category: "machinery", description: "Team had difficulty with the foamer, requested assistance", actionNeeded: "Dispatch technician to inspect foamer unit", responsiblePerson: "Maintenance Lead", status: "open" },
        { id: "i3", category: "cleaning-findings", description: "Container light needs fixing — too dark during morning shift", actionNeeded: "Replace light fitting, electrician call-out", responsiblePerson: "Facilities", status: "open" },
        { id: "i4", category: "cleaning-findings", description: "Team cleaning yard and inside container", actionNeeded: "Continue daily schedule", responsiblePerson: "BHL Team", status: "in-progress" },
        { id: "i5", category: "personnel", description: "Simon Andreas wants leave on 25/06/2026", actionNeeded: "Process leave request, arrange cover", responsiblePerson: "HR", status: "open" },
      ],
    },
    {
      id: "s3",
      siteName: "BACHMUS",
      reporterName: "COETZEE",
      summary: "3 trucks and 1 car washed. Customer complaint about poor cleaning addressed on site.",
      items: [
        { id: "i1", category: "cleaning-findings", description: "3 trucks and 1 car washed on 23/06/2026", actionNeeded: "None — completed", responsiblePerson: "Bachmus Team", status: "resolved" },
        { id: "i2", category: "cleaning-findings", description: "Complaint of poor cleaning on a truck — Coetzee was on site to address the team", actionNeeded: "Re-wash standards briefing, follow-up quality check", responsiblePerson: "Coetzee", status: "in-progress" },
        { id: "i3", category: "cleaning-findings", description: "Team cleaning ablutions daily if trucks are few", actionNeeded: "Maintain daily schedule", responsiblePerson: "Bachmus Team", status: "in-progress" },
      ],
    },
    {
      id: "s4",
      siteName: "DEEP OCEAN",
      reporterName: "FRANS",
      summary: "Rust issues across glazing shoots, fish racks and grader pockets. Internal audit upcoming. Site has 3 shortages.",
      items: [
        { id: "i1", category: "cleaning-findings", description: "Rust on Glazing shoots, fish racks and grader pockets", actionNeeded: "Team to react all rust immediately", responsiblePerson: "Deep Ocean Team", status: "open" },
        { id: "i2", category: "cleaning-findings", description: "Plate freezer area to squeegee daily", actionNeeded: "Add to daily cleaning checklist", responsiblePerson: "Site Supervisor", status: "in-progress" },
        { id: "i3", category: "cleaning-findings", description: "Final rinsing to be done with fresh water", actionNeeded: "Confirm fresh water supply, brief team", responsiblePerson: "Site Supervisor", status: "in-progress" },
        { id: "i4", category: "other", description: "Site has an internal audit", actionNeeded: "Prepare audit folder, brief team on standards", responsiblePerson: "Quality Manager", status: "open" },
        { id: "i5", category: "personnel", description: "Site has 3 shortages", actionNeeded: "Coordinate with HR for transfers or new hires", responsiblePerson: "HR / Operations Manager", status: "open" },
      ],
    },
    {
      id: "s5",
      siteName: "PEREIRA",
      reporterName: "FRANS",
      summary: "Rust on S/Steel of glazing tank and sorting grader. Black brushware needed. Housekeeping issues. One staff member on leave.",
      items: [
        { id: "i1", category: "cleaning-findings", description: "Rust on S/Steel of glazing tank and sorting grader", actionNeeded: "Treat rust, schedule descaling", responsiblePerson: "Maintenance Lead", status: "open" },
        { id: "i2", category: "ppe-equipment", description: "Leonard to order black brushware for drains cleaning", actionNeeded: "Place PO, follow up delivery", responsiblePerson: "Leonard (Procurement)", status: "in-progress" },
        { id: "i3", category: "cleaning-findings", description: "Poor housekeeping in chemical room", actionNeeded: "Reorganize chemical storage, brief team on standards", responsiblePerson: "Site Supervisor", status: "open" },
        { id: "i4", category: "personnel", description: "Mathew Niilonga is on leave", actionNeeded: "Arrange cover", responsiblePerson: "HR", status: "resolved" },
      ],
    },
  ];

  await db.factoryReport.create({
    data: {
      title: "Daily Factory Report — 24 June 2026",
      reportDate: new Date("2026-06-24"),
      company: "BAYWASH CLEANING",
      frequency: "DAILY",
      compiledBy: "FRANS AND COETZEE",
      compiledFor: "OPERATIONS TEAM",
      sections: JSON.stringify(factoryReportSections),
      status: "submitted",
      notes: "Multi-site daily report covering 5 sites. Several urgent machinery items flagged for immediate action.",
    },
  });

  // Also create a couple of older reports for history
  await db.factoryReport.create({
    data: {
      title: "Daily Factory Report — 23 June 2026",
      reportDate: new Date("2026-06-23"),
      company: "BAYWASH CLEANING",
      frequency: "DAILY",
      compiledBy: "FRANS",
      compiledFor: "OPERATIONS TEAM",
      sections: JSON.stringify([
        {
          id: "s1", siteName: "HANGANA", reporterName: "COETZEE", summary: "Routine day, minor cleaning items.",
          items: [
            { id: "i1", category: "cleaning-findings", description: "Conveyor packer line cleaned", actionNeeded: "None", responsiblePerson: "Team", status: "resolved" },
            { id: "i2", category: "machinery", description: "Routine lubrication of autoplate sprockets", actionNeeded: "None", responsiblePerson: "Maintenance", status: "resolved" },
          ],
        },
        {
          id: "s2", siteName: "DEEP OCEAN", reporterName: "FRANS", summary: "All clear.",
          items: [
            { id: "i1", category: "cleaning-findings", description: "Plate freezer squeegeed", actionNeeded: "None", responsiblePerson: "Team", status: "resolved" },
          ],
        },
      ]),
      status: "reviewed",
      notes: "Routine day — all items closed.",
    },
  });

  await db.factoryReport.create({
    data: {
      title: "Daily Factory Report — 22 June 2026",
      reportDate: new Date("2026-06-22"),
      company: "BAYWASH CLEANING",
      frequency: "DAILY",
      compiledBy: "COETZEE",
      compiledFor: "OPERATIONS TEAM",
      sections: JSON.stringify([
        {
          id: "s1", siteName: "BHL", reporterName: "COETZEE", summary: "Foamer issue first reported.",
          items: [
            { id: "i1", category: "machinery", description: "Foamer pressure low — first reported", actionNeeded: "Technician call-out", responsiblePerson: "Maintenance Lead", status: "in-progress" },
            { id: "i2", category: "cleaning-findings", description: "3 trucks washed", actionNeeded: "None", responsiblePerson: "Team", status: "resolved" },
          ],
        },
        {
          id: "s2", siteName: "PEREIRA", reporterName: "FRANS", summary: "Chemical room housekeeping flagged.",
          items: [
            { id: "i1", category: "cleaning-findings", description: "Chemical room cluttered", actionNeeded: "Reorganize by end of week", responsiblePerson: "Site Supervisor", status: "open" },
          ],
        },
      ]),
      status: "reviewed",
      notes: "Foamer issue first surfaced here.",
    },
  });

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

  // ---------- Official company form samples ----------
  await db.formSubmission.create({
    data: {
      template: "incident-report",
      createdBy: "Sarah Chen",
      data: JSON.stringify({
        incidentId: "IR-2026-0001",
        dateOfIncident: "2026-11-12",
        timeOfIncident: "10:45",
        customerName: "Anna Visser",
        customerInformation: "Tel: +264 81 234 5678 · anna.visser@example.com · Swakopmund",
        dateCustomerReported: "2026-11-12",
        vehicleDetails: "Toyota Corolla 2020 · white · CA-456-123",
        natureOfDamage: "Scratches on the left rear door panel and scuff mark on rear bumper caused by vacuum hose attachment falling during interior cleaning.",
        employeeInvolved: "yes",
        employeeNames: "Tom Bradley",
        actionTakenByCustomer: "Reported the damage immediately at the service desk with photos.",
        desiredResolution: "Professional polish & touch-up paint at no cost.",
        actionTakenByCompany: "Incident logged; body shop quotation requested; customer offered courtesy wash while awaiting assessment.",
        employeeHandling: "Sarah Chen",
        followUpActions: "Body shop assessment on 14/11/2026; repair scheduled for 18/11/2026; manager to confirm completion with customer.",
        managementSignatory: "Dirk Bosman",
      }),
    },
  });
  await db.formSubmission.create({
    data: {
      template: "customer-complaint",
      createdBy: "Sarah Chen",
      data: JSON.stringify({
        date: "2026-11-14",
        complaintId: "CC-2026-0001",
        receivedVia: "Phone call",
        clientName: "Pieter van Wyk",
        clientEmail: "p.vanwyk@example.com",
        supervisorName: "Carlos Mendoza",
        employeeName: "Lena Fischer",
        incidentDetails: "Client states the interior was not fully cleaned — crumbs still visible on the back seats and a faint damp smell after the full-service wash on 13/11/2026.",
        clientWants: "Free re-clean of the interior and assurance the drying process is improved.",
        companyAction: "Apologised; re-clean scheduled same afternoon at no charge; drying protocol reviewed with the team.",
        dealtWithBy: "Carlos Mendoza",
        complaintHandled: "yes",
        managementSignatory: "Dirk Bosman",
        employeeSignatory: "Carlos Mendoza",
      }),
    },
  });
  await db.formSubmission.create({
    data: {
      template: "leave-application",
      createdBy: "Emma Lindqvist",
      data: JSON.stringify({
        employeeName: "Marcus Reyes",
        companyNo: "BW-1002",
        section: "Logistics",
        l1Opts: ["FULL"],
        l1From: "2026-12-01",
        l1To: "2026-12-12",
        l1Days: "10",
        addressWhileOnLeave: "14 Coral Street, Vineta, Swakopmund",
        holidayBonus: "yes",
        leavePay: "yes",
      }),
    },
  });

  // ---------- Settings ----------
  await db.setting.create({ data: { key: "company.name", value: "BAYWASH Group" } });
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
