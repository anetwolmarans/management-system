// Single form submission — get / update / delete.
import { db } from "@/lib/db";
import { json, err, parseBody } from "@/lib/api";
import { getTemplate, templateFieldKeys, FormData } from "@/lib/forms";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await db.formSubmission.findUnique({ where: { id } });
  if (!row) return err("Form submission not found", 404);
  return json({ ...row, data: JSON.parse(row.data) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await db.formSubmission.findUnique({ where: { id } });
  if (!existing) return err("Form submission not found", 404);

  const template = getTemplate(existing.template);
  if (!template) return err("Unknown form template", 400);

  const body = await parseBody<{ data?: FormData }>(req);
  const incoming = body.data ?? {};
  const keys = templateFieldKeys(template);
  const current = JSON.parse(existing.data) as FormData;

  const clean: FormData = { ...current };
  for (const key of keys) {
    const v = incoming[key];
    if (v === undefined) continue; // untouched keys keep their stored value
    if (v === null || v === "") {
      delete clean[key];
      continue;
    }
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

  const row = await db.formSubmission.update({
    where: { id },
    data: { data: JSON.stringify(clean) },
  });
  return json({ ...row, data: JSON.parse(row.data) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await db.formSubmission.findUnique({ where: { id } });
  if (!existing) return err("Form submission not found", 404);
  await db.formSubmission.delete({ where: { id } });
  return json({ ok: true });
}
