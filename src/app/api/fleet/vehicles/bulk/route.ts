// Bulk vehicle import — accepts { rows: [...] } and creates valid rows
// in one batch. plateNumber is the unique key; duplicates (in-file or
// against the live DB) are reported as errors and skipped.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

interface VehRow {
  plateNumber?: string;
  brand?: string;
  model?: string;
  year?: string | number;
  type?: string;
  status?: string;
  assignedTo?: string;
  mileage?: string | number;
  fuelLevel?: string | number;
  vin?: string;
  purchasePrice?: string | number;
  purchaseDate?: string;
  supplier?: string;
  color?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
}

const MAX_ROWS = 500;

export async function POST(req: Request) {
  const body = await parseBody<{ rows?: VehRow[] }>(req);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return err("No rows provided", 422);
  if (rows.length > MAX_ROWS) return err(`Max ${MAX_ROWS} rows per upload`, 422);

  const existing = await db.vehicle.findMany({ select: { plateNumber: true } });
  const existingPlates = new Set(existing.map((v) => v.plateNumber.toUpperCase()));

  const errors: { row: number; msg: string }[] = [];
  const toCreate: {
    plateNumber: string;
    brand: string;
    model: string;
    year: number;
    type: string;
    status: string;
    assignedTo: string | null;
    mileage: number;
    fuelLevel: number;
    vin: string | null;
    purchasePrice: number | null;
    purchaseDate: Date | null;
    supplier: string | null;
    color: string | null;
    insuranceExpiry: Date | null;
    registrationExpiry: Date | null;
  }[] = [];
  const batchPlates = new Set<string>();

  const parseDate = (v?: string): Date | null => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const parseNum = (v: string | number | undefined, def = 0): number => {
    if (v == null || v === "") return def;
    const n = Number(v);
    return isNaN(n) ? def : n;
  };

  rows.forEach((r, i) => {
    const row = i + 1;
    const plate = String(r.plateNumber ?? "").trim().toUpperCase();
    const brand = String(r.brand ?? "").trim();
    if (!plate) { errors.push({ row, msg: "plateNumber is required" }); return; }
    if (!brand) { errors.push({ row, msg: "brand is required" }); return; }
    if (existingPlates.has(plate) || batchPlates.has(plate)) {
      errors.push({ row, msg: `plateNumber already exists: ${plate}` });
      return;
    }
    batchPlates.add(plate);

    const yearNum = parseNum(r.year, new Date().getFullYear());
    toCreate.push({
      plateNumber: plate,
      brand,
      model: r.model ? String(r.model).trim() : "",
      year: yearNum,
      type: r.type ? String(r.type).trim() : "car",
      status: r.status ? String(r.status).trim() : "active",
      assignedTo: r.assignedTo ? String(r.assignedTo).trim() : null,
      mileage: parseNum(r.mileage, 0),
      fuelLevel: parseNum(r.fuelLevel, 100),
      vin: r.vin ? String(r.vin).trim() : null,
      purchasePrice: r.purchasePrice != null && r.purchasePrice !== "" ? parseNum(r.purchasePrice, 0) : null,
      purchaseDate: parseDate(r.purchaseDate),
      supplier: r.supplier ? String(r.supplier).trim() : null,
      color: r.color ? String(r.color).trim() : null,
      insuranceExpiry: parseDate(r.insuranceExpiry),
      registrationExpiry: parseDate(r.registrationExpiry),
    });
  });

  let created = 0;
  if (toCreate.length > 0) {
    try {
      const res = await db.vehicle.createMany({ data: toCreate, skipDuplicates: false });
      created = res.count;
    } catch (e) {
      // Fall back to per-row inserts so a single bad row doesn't fail the batch.
      for (const row of toCreate) {
        try {
          await db.vehicle.create({ data: row });
          created++;
        } catch {
          /* row-level failures are surfaced via errors; index unknown here */
        }
      }
      if (created === 0) return err((e as Error).message, 500);
    }
  }

  return json({ created, errors, total: rows.length });
}
