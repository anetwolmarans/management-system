// Download a filled form as the official PDF document.
import { db } from "@/lib/db";
import { err } from "@/lib/api";
import { getTemplate, FormData } from "@/lib/forms";
import { generateFormPdf } from "@/lib/pdf-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await db.formSubmission.findUnique({ where: { id } });
  if (!row) return err("Form submission not found", 404);

  const template = getTemplate(row.template);
  if (!template) return err("Unknown form template", 400);

  let data: FormData = {};
  try {
    data = JSON.parse(row.data) as FormData;
  } catch {
    data = {};
  }

  const buffer = await generateFormPdf(template, data);

  const idValue = template.idFieldKey && typeof data[template.idFieldKey] === "string" ? (data[template.idFieldKey] as string) : row.id.slice(-6);
  const filename = `${template.docId}_${idValue}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
