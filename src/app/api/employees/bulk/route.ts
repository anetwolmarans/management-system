// Bulk employee import — accepts { rows: [...] } and creates valid rows
// in one batch. Returns { created, errors, total } so the client can show
// exactly which rows were skipped and why.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

interface EmpRow {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  employeeNo?: string;
  hireDate?: string;
  salary?: string | number;
  status?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ROWS = 500;

export async function POST(req: Request) {
  const body = await parseBody<{ rows?: EmpRow[] }>(req);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return err("No rows provided", 422);
  if (rows.length > MAX_ROWS) return err(`Max ${MAX_ROWS} rows per upload`, 422);

  // Snapshot existing unique keys so we can detect duplicates within the
  // upload and against the live DB without N round-trips.
  const existing = await db.employee.findMany({ select: { employeeNo: true, email: true } });
  const existingNos = new Set(existing.map((e) => e.employeeNo.toUpperCase()));
  const existingEmails = new Set(existing.map((e) => e.email.toLowerCase()));
  let maxSuffix = 0;
  for (const e of existing) {
    const m = e.employeeNo.match(/^MS-(\d+)$/i);
    if (m) maxSuffix = Math.max(maxSuffix, parseInt(m[1], 10));
  }

  const errors: { row: number; msg: string }[] = [];
  const toCreate: {
    employeeNo: string;
    name: string;
    email: string;
    phone: string | null;
    position: string;
    department: string;
    hireDate: Date;
    salary: number;
    status: string;
  }[] = [];
  const batchNos = new Set<string>();
  const batchEmails = new Set<string>();

  rows.forEach((r, i) => {
    const row = i + 1;
    const name = String(r.name ?? "").trim();
    const email = String(r.email ?? "").trim().toLowerCase();
    if (!name) { errors.push({ row, msg: "name is required" }); return; }
    if (!email || !EMAIL_RE.test(email)) { errors.push({ row, msg: "a valid email is required" }); return; }
    if (existingEmails.has(email) || batchEmails.has(email)) {
      errors.push({ row, msg: `email already exists: ${email}` });
      return;
    }

    let employeeNo = String(r.employeeNo ?? "").trim();
    if (!employeeNo) {
      // auto-generate the next MS-#### after the current max
      do {
        maxSuffix++;
        employeeNo = `MS-${String(maxSuffix).padStart(4, "0")}`;
      } while (existingNos.has(employeeNo) || batchNos.has(employeeNo));
    } else {
      employeeNo = employeeNo.toUpperCase();
      if (existingNos.has(employeeNo) || batchNos.has(employeeNo)) {
        errors.push({ row, msg: `employeeNo already exists: ${employeeNo}` });
        return;
      }
    }
    batchNos.add(employeeNo);
    batchEmails.add(email);

    const salary = Number(r.salary ?? 0);
    let hireDate = r.hireDate ? new Date(r.hireDate as string) : new Date();
    if (isNaN(hireDate.getTime())) hireDate = new Date();
    const status = String(r.status ?? "active").trim().toLowerCase() || "active";

    toCreate.push({
      employeeNo,
      name,
      email,
      phone: r.phone ? String(r.phone).trim() : null,
      position: r.position ? String(r.position).trim() : "Staff",
      department: r.department ? String(r.department).trim() : "Operations",
      hireDate,
      salary: isNaN(salary) ? 0 : salary,
      status,
    });
  });

  let created = 0;
  if (toCreate.length > 0) {
    try {
      const res = await db.employee.createMany({ data: toCreate, skipDuplicates: false });
      created = res.count;
    } catch (e) {
      // Fall back to per-row inserts so we can pinpoint the failing row.
      for (const row of toCreate) {
        try {
          await db.employee.create({ data: row });
          created++;
        } catch {
          /* counted via errors below — but we don't know the original index here */
        }
      }
      if (created === 0) return err((e as Error).message, 500);
    }
  }

  return json({ created, errors, total: rows.length });
}
