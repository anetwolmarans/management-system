// Official BAYWASH company forms — list + create submissions.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";
import { getTemplate, templateFieldKeys, FormData, suggestDocId } from "@/lib/forms";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const template = url.searchParams.get("template");
  const rows = await db.formSubmission.findMany({
    where: template ? { template } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  return json(
    rows.map((r) => ({ ...r, data: JSON.parse(r.data) }))
  );
}

export async function POST(req: Request) {
  const body = await parseBody<{ template?: string; data?: FormData }>(req);
  const template = getTemplate(body.template ?? "");
  if (!template) return err("Unknown form template", 400);

  const incoming = body.data ?? {};
  const keys = templateFieldKeys(template);

  // Sanitize: keep only known keys; enforce checkbox arrays.
  const clean: FormData = {};
  for (const key of keys) {
    const v = incoming[key];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      const field = template.sections.flatMap((s) => s.fields).find((f) => f.key === key);
      if (field?.type === "checkbox-group") {
        clean[key] = v.filter((x) => field.checkboxOptions?.includes(String(x))).map(String);
      } else {
        clean[key] = String(v);
      }
    } else {
      clean[key] = String(v);
    }
  }

  // Auto-suggest document IDs when not provided.
  if (template.idFieldKey && !clean[template.idFieldKey] && template.idPrefix) {
    const existing = await db.formSubmission.findMany({ where: { template: template.id } });
    const ids = existing
      .map((r) => {
        try {
          const d = JSON.parse(r.data) as FormData;
          return typeof d[template.idFieldKey!] === "string" ? (d[template.idFieldKey!] as string) : "";
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    clean[template.idFieldKey] = suggestDocId(template.idPrefix, ids);
  }

  const row = await db.formSubmission.create({
    data: {
      template: template.id,
      data: JSON.stringify(clean),
      createdBy: "Sarah Chen",
    },
  });
  return json({ ...row, data: JSON.parse(row.data) }, 201);
}
