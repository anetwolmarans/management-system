// ============================================================
// Management System — official company form PDF generator.
// Replicates the original paper documents (header block with
// logo + doc-control table, navy company strip, section
// banners, fill-in boxes, checkbox groups, signature lines).
// ============================================================
import PDFDocument from "pdfkit";
import path from "path";
import {
  FormTemplate,
  FormData,
  FormDataValue,
  FormField,
  formatValue,
  LEAVE_ROWS,
} from "./forms";

const NAVY = "#01205E";
const CYAN = "#00AEEF";
const INK = "#1a2233";
const LINE = "#5a6a8c";
const LIGHT = "#c9d4e8";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const M = 36; // margin
const CONTENT_W = PAGE_W - M * 2; // 523
const FOOTER_ZONE = 46;

interface Ctx {
  doc: PDFKit.PDFDocument;
  data: FormData;
  template: FormTemplate;
}

// ---------- low-level helpers ----------

function fontBody(doc: PDFKit.PDFDocument) {
  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
}
function fontLabel(doc: PDFKit.PDFDocument) {
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK);
}

function ensureSpace(ctx: Ctx, needed: number, drawHeader: (doc: PDFKit.PDFDocument) => void) {
  const { doc } = ctx;
  if (doc.y + needed > PAGE_H - M - FOOTER_ZONE) {
    doc.addPage();
    drawHeader(doc);
    doc.y = HEADER_H + M + 22;
  }
}

function drawFooter(ctx: Ctx, pageIndex: number, pageCount: number) {
  const { doc, template } = ctx;
  const y = PAGE_H - M - 12;
  doc.font("Helvetica").fontSize(7).fillColor("#6a7a99");
  doc.text(`${template.docId}  ·  ${template.title}`, M, y, { lineBreak: false, width: CONTENT_W - 130 });
  doc.text(`Page ${pageIndex + 1} of ${pageCount}`, PAGE_W - M - 100, y, { lineBreak: false, width: 100, align: "right" });
}

// ---------- header (logo | title | meta table + navy strip) ----------

const HEADER_H = 74;

function drawHeader(doc: PDFKit.PDFDocument) {
  const y0 = M;
  // outer header box
  doc.rect(M, y0, CONTENT_W, HEADER_H).lineWidth(1.2).strokeColor(NAVY).stroke();
  // left logo cell
  const logoW = 120;
  doc.moveTo(M + logoW, y0).lineTo(M + logoW, y0 + HEADER_H).lineWidth(1.2).strokeColor(NAVY).stroke();
  const logoPath = path.join(process.cwd(), "public", "brand-mark.png");
  try {
    doc.image(logoPath, M + (logoW - 46) / 2, y0 + 6, { width: 46, height: 46 });
  } catch {
    /* logo optional */
  }
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(NAVY);
  doc.text("MANAGEMENT SYSTEM", M, y0 + 56, { width: logoW, align: "center" });

  // center title cell
  const midX = M + logoW;
  const metaW = 190;
  const midW = CONTENT_W - logoW - metaW;
  doc.font("Helvetica-Bold").fontSize(14.5).fillColor(NAVY);
  // title text vertically centered
  doc.text(doc._formTitle ?? "", midX + 6, y0 + HEADER_H / 2 - 9, { width: midW - 12, align: "center" });

  // right meta table: 6 rows
  const meta = doc._formMeta as { label: string; value: string }[];
  const rowH = HEADER_H / meta.length;
  const mx = PAGE_W - M - metaW;
  meta.forEach((row, i) => {
    const ry = y0 + i * rowH;
    if (i > 0) {
      doc.moveTo(mx, ry).lineTo(PAGE_W - M, ry).lineWidth(0.6).strokeColor(LINE).stroke();
      doc.moveTo(mx, ry).lineTo(mx, y0 + HEADER_H).lineWidth(0).strokeColor(LINE).stroke();
    }
    doc.moveTo(mx + 62, ry).lineTo(mx + 62, ry + rowH).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.font("Helvetica-Bold").fontSize(6.3).fillColor(NAVY);
    doc.text(row.label, mx + 4, ry + rowH / 2 - 4, { width: 56, lineBreak: false, characterSpacing: 0 });
    doc.font("Helvetica").fontSize(6.8).fillColor(INK);
    doc.text(row.value, mx + 66, ry + rowH / 2 - 4, { width: metaW - 70, lineBreak: false });
  });
  // vertical separators for logo|title|meta
  doc.moveTo(mx, y0).lineTo(mx, y0 + HEADER_H).lineWidth(1.2).strokeColor(NAVY).stroke();

  // navy company strip
  const stripY = y0 + HEADER_H;
  doc.rect(M, stripY, CONTENT_W, 17).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
  doc.text(doc._formCompany ?? "", M, stripY + 4.5, { width: CONTENT_W, align: "center", lineBreak: false });

  doc.y = stripY + 17 + 14;
  doc.x = M;
}

// ---------- field renderers ----------

function fieldBoxHeight(doc: PDFKit.PDFDocument, field: FormField, value: FormDataValue | undefined): number {
  if (field.type === "textarea") {
    const text = value ? String(value) : "";
    const h = text ? doc.heightOfString(text, { width: CONTENT_W - 14 }) : 0;
    return Math.max(46, h + 12);
  }
  if (field.type === "checkbox-group") return 18;
  return 20;
}

function drawCheckbox(doc: PDFKit.PDFDocument, x: number, y: number, checked: boolean, label: string, size = 8) {
  doc.rect(x, y, size, size).lineWidth(0.9).strokeColor(INK).stroke();
  if (checked) {
    doc.font("Helvetica-Bold").fontSize(7).fillColor(NAVY);
    doc.text("X", x + 1.6, y + 0.6, { lineBreak: false, width: size });
  }
  doc.font("Helvetica").fontSize(7.5).fillColor(INK);
  doc.text(label, x + size + 4, y + 0.5, { lineBreak: false });
}

function drawField(ctx: Ctx, field: FormField, drawHeader: (doc: PDFKit.PDFDocument) => void) {
  const { doc, data, template } = ctx;
  const value: FormDataValue | undefined = data[field.key];
  const shown = formatValue(field, value);

  // label + box heights
  let boxH: number;
  doc.font("Helvetica").fontSize(9.5);
  boxH = fieldBoxHeight(doc, field, value);
  const labelH = 12;
  ensureSpace(ctx, labelH + boxH + 6, drawHeader);

  // label line — draw at fixed position, then set y explicitly (doc.text advances y otherwise)
  const labelY = doc.y;
  fontLabel(doc);
  const labelSuffix = field.type === "yesno" || field.type === "checkbox-group" ? "" : ":";
  doc.text(`${field.label}${labelSuffix}`, M, labelY, { lineBreak: false, width: CONTENT_W });
  doc.y = labelY + labelH;

  if (field.type === "yesno") {
    // YES [ ] NO [ ]
    const v = String(value ?? "").toLowerCase();
    const rowH = 16;
    doc.rect(M, doc.y, CONTENT_W, rowH).lineWidth(0.8).strokeColor(LIGHT).fillAndStroke("#f7f9fd", LINE);
    drawCheckbox(doc, M + 12, doc.y + 4, v === "yes", "YES");
    drawCheckbox(doc, M + 70, doc.y + 4, v === "no", "NO");
    doc.y += rowH + 6;
    return;
  }

  if (field.type === "checkbox-group") {
    const selected = Array.isArray(value) ? value : [];
    doc.rect(M, doc.y, CONTENT_W, boxH).lineWidth(0.8).strokeColor(LIGHT).fillAndStroke("#f7f9fd", LINE);
    let cx = M + 12;
    for (const opt of field.checkboxOptions ?? []) {
      drawCheckbox(doc, cx, doc.y + 4, selected.includes(opt), opt);
      cx += doc.widthOfString(opt) * 0.82 + 34;
    }
    doc.y += boxH + 6;
    return;
  }

  // boxed value (text/textarea/date/time/number/select)
  doc.rect(M, doc.y, CONTENT_W, boxH).lineWidth(0.9).strokeColor(LINE).stroke();
  if (shown) {
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NAVY);
    doc.text(shown, M + 7, doc.y + 5, { width: CONTENT_W - 14 });
  }
  doc.y += boxH + 7;
  void template;
}

// ---------- special: MLAF leave table ----------

function drawLeaveTable(ctx: Ctx, drawHeader: (doc: PDFKit.PDFDocument) => void) {
  const { doc, data } = ctx;
  const colType = 203;
  const colFrom = 80;
  const colTo = 80;
  const colDays = 80;
  const colCredit = CONTENT_W - colType - colFrom - colTo - colDays;
  const x0 = M;

  const rowHeights = LEAVE_ROWS.map((row) => {
    const lines = [row.name, row.note ?? ""].filter(Boolean);
    return Math.max(30, 10 + lines.length * 8 + (row.checkboxOptions?.length ?? 0) * 9);
  });
  const headerH = 26;
  ensureSpace(ctx, headerH + rowHeights.reduce((a, b) => a + b, 0) + 30, drawHeader);

  // header row
  const hy = doc.y;
  doc.rect(x0, hy, CONTENT_W, headerH).lineWidth(1).strokeColor(NAVY).fillAndStroke(NAVY, NAVY);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
  doc.text("TYPE OF LEAVE APPLIED FOR", x0 + 8, hy + 4, { width: colType - 16, lineBreak: false });
  doc.text("DATES", x0 + colType, hy + 2.5, { width: colFrom + colTo, align: "center", lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(6.8).fillColor("#ffffff");
  doc.text("FROM", x0 + colType + 4, hy + 14, { width: colFrom - 8, align: "center", lineBreak: false });
  doc.text("TO", x0 + colType + colFrom + 4, hy + 14, { width: colTo - 8, align: "center", lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(7.2).fillColor("#ffffff");
  doc.text("No. OF", x0 + colType + colFrom + colTo + 4, hy + 8, { width: colDays - 8, align: "center", lineBreak: false });
  doc.text("DAYS", x0 + colType + colFrom + colTo + 4, hy + 16, { width: colDays - 8, align: "center", lineBreak: false });
  doc.text("No. OF DAYS", x0 + colType + colFrom + colTo + colDays + 4, hy + 8, { width: colCredit - 8, align: "center", lineBreak: false });
  doc.text("CREDIT", x0 + colType + colFrom + colTo + colDays + 4, hy + 17, { width: colCredit - 8, align: "center", lineBreak: false });

  let y = hy + headerH;
  LEAVE_ROWS.forEach((row, idx) => {
    const rh = rowHeights[idx];
    // type cell
    doc.rect(x0, y, colType, rh).lineWidth(0.9).strokeColor(NAVY).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(INK);
    doc.text(`${row.no}. ${row.name}`, x0 + 7, y + 5, { width: colType - 14, lineBreak: false });
    let ty = y + 15;
    if (row.note) {
      doc.font("Helvetica").fontSize(6.3).fillColor("#5a6a8c");
      doc.text(row.note, x0 + 7, ty, { width: colType - 14 });
      ty += doc.heightOfString(row.note, { width: colType - 14 }) + 2;
    }
    if (row.checkboxOptions?.length) {
      const selected = Array.isArray(data[`${row.prefix}Opts`]) ? (data[`${row.prefix}Opts`] as string[]) : [];
      for (const opt of row.checkboxOptions) {
        drawCheckbox(doc, x0 + 7, ty, selected.includes(opt), opt, 7);
        ty += 10;
      }
    } else if (row.no === 3 || row.no === 6) {
      const applied = String(data[`${row.prefix}Applied`] ?? "").toLowerCase();
      drawCheckbox(doc, x0 + 7, ty, applied === "yes", "APPLIED FOR", 7);
    }
    // value cells (FROM / TO / DAYS / CREDIT)
    const cells: Array<[number, number, string]> = [
      [colType, colFrom, data[`${row.prefix}From`] ? formatValue({ type: "date" }, data[`${row.prefix}From`]) : ""],
      [colType + colFrom, colTo, data[`${row.prefix}To`] ? formatValue({ type: "date" }, data[`${row.prefix}To`]) : ""],
      [colType + colFrom + colTo, colDays, String(data[`${row.prefix}Days`] ?? "")],
      [colType + colFrom + colTo + colDays, colCredit, String(data[`${row.prefix}Credit`] ?? "")],
    ];
    for (const [cx, cw, val] of cells) {
      doc.rect(x0 + cx, y, cw, rh).lineWidth(0.9).strokeColor(NAVY).stroke();
      if (val) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY);
        doc.text(val, x0 + cx + 4, y + 6, { width: cw - 8, align: "center", lineBreak: false });
      }
    }
    y += rh;
  });
  doc.y = y + 14;
  doc.x = M;
}

function drawAbsenceTable(ctx: Ctx, drawHeader: (doc: PDFKit.PDFDocument) => void) {
  const { doc, data } = ctx;
  const colType = 263;
  const colFrom = 80;
  const colTo = 80;
  const colDays = CONTENT_W - colType - colFrom - colTo;
  const x0 = M;
  const headerH = 18;
  const rows = [
    { name: "7. UNPAID", note: "(Give Reason)", reason: String(data.unpaidReason ?? ""), from: data.unpaidFrom, to: data.unpaidTo, days: data.unpaidDays },
    { name: "8. AWOL", note: "", reason: "", from: data.awolFrom, to: data.awolTo, days: data.awolDays },
  ];
  const rowH = 34;
  ensureSpace(ctx, headerH + rows.length * rowH + 20, drawHeader);

  const hy = doc.y;
  doc.rect(x0, hy, CONTENT_W, headerH).lineWidth(1).strokeColor(NAVY).fillAndStroke(NAVY, NAVY);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
  doc.text("ABSENCE WITHOUT ACCRUAL OF BENEFITS", x0 + 8, hy + 5, { width: colType - 16, lineBreak: false });
  doc.text("FROM", x0 + colType + 4, hy + 5, { width: colFrom - 8, align: "center", lineBreak: false });
  doc.text("TO", x0 + colType + colFrom + 4, hy + 5, { width: colTo - 8, align: "center", lineBreak: false });
  doc.text("No. OF DAYS", x0 + colType + colFrom + colTo + 4, hy + 5, { width: colDays - 8, align: "center", lineBreak: false });

  let y = hy + headerH;
  for (const row of rows) {
    doc.rect(x0, y, colType, rowH).lineWidth(0.9).strokeColor(NAVY).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(INK);
    doc.text(row.name, x0 + 7, y + 5, { width: colType - 14, lineBreak: false });
    if (row.note) {
      doc.font("Helvetica").fontSize(6.3).fillColor("#5a6a8c");
      doc.text(row.note, x0 + 7, y + 15, { width: colType - 14, lineBreak: false });
    }
    if (row.reason) {
      doc.font("Helvetica").fontSize(7.5).fillColor(NAVY);
      doc.text(row.reason, x0 + 7, y + 22, { width: colType - 14 });
    }
    const vcells: Array<[number, number, string]> = [
      [colType, colFrom, row.from ? formatValue({ type: "date" }, row.from) : ""],
      [colType + colFrom, colTo, row.to ? formatValue({ type: "date" }, row.to) : ""],
      [colType + colFrom + colTo, colDays, String(row.days ?? "")],
    ];
    for (const [cx, cw, val] of vcells) {
      doc.rect(x0 + cx, y, cw, rowH).lineWidth(0.9).strokeColor(NAVY).stroke();
      if (val) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY);
        doc.text(val, x0 + cx + 4, y + 6, { width: cw - 8, align: "center", lineBreak: false });
      }
    }
    y += rowH;
  }
  doc.y = y + 14;
  doc.x = M;
}

// ---------- payments + footer fields (MLAF) ----------

function drawPayments(ctx: Ctx, drawHeader: (doc: PDFKit.PDFDocument) => void) {
  const { doc, data } = ctx;
  ensureSpace(ctx, 96, drawHeader);
  fontLabel(doc);
  doc.text("PAYMENTS REQUIRED (Tick Appropriate Box)", M, doc.y, { lineBreak: false });
  doc.y += 18;
  const items: Array<[string, string]> = [
    ["a.", "HOLIDAY BONUS"],
    ["b.", "LEAVE PAY"],
    ["c.", "COMMUTATION"],
  ];
  for (const [num, label] of items) {
    const key = num === "a." ? "holidayBonus" : num === "b." ? "leavePay" : "commutation";
    const v = String(data[key] ?? "").toLowerCase();
    ensureSpace(ctx, 16, drawHeader);
    const rowY = doc.y;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK);
    doc.text(`${num}  ${label}`, M + 10, rowY, { lineBreak: false, width: 200 });
    if (num === "c.") {
      doc.text(`No. OF DAYS:  ${String(data.commutationDays ?? "")}`, M + 150, rowY, { lineBreak: false, width: 160 });
    }
    drawCheckbox(doc, M + 330, rowY + 1, v === "yes", "YES", 8);
    drawCheckbox(doc, M + 420, rowY + 1, v === "no", "NO", 8);
    doc.y = rowY + 15;
  }
  doc.font("Helvetica").fontSize(6.5).fillColor("#5a6a8c");
  const noteY2 = doc.y + 2;
  doc.text(
    "* After commutation the employee must have 15 days leave left (if less than 20 days leave were taken during the preceding leave cycle). Payment will only be included with the next salary.",
    M, noteY2, { width: CONTENT_W }
  );
  doc.y = noteY2 + doc.heightOfString("* After commutation the employee must have 15 days leave left (if less than 20 days leave were taken during the preceding leave cycle). Payment will only be included with the next salary.", { width: CONTENT_W }) + 10;
  doc.x = M;
}

// ---------- signature blocks ----------

function drawSignBlocks(ctx: Ctx, drawHeader: (doc: PDFKit.PDFDocument) => void) {
  const { doc, template, data } = ctx;
  for (const block of template.signBlocks) {
    ensureSpace(ctx, 64, drawHeader);
    const y = doc.y + 12;
    const colW = (CONTENT_W - 40) / 2;
    // left line
    doc.moveTo(M, y).lineTo(M + colW - 20, y).lineWidth(0.9).strokeColor(INK).stroke();
    if (block.leftNameKey && data[block.leftNameKey]) {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(NAVY);
      doc.text(String(data[block.leftNameKey]), M, y + 3, { width: colW - 20, align: "center", lineBreak: false });
    }
    fontLabel(doc);
    doc.text(block.leftLabel, M, y + (block.leftNameKey && data[block.leftNameKey] ? 16 : 3), { width: colW - 20, align: "left" });
    if (block.rightLabel) {
      const rx = M + colW + 40;
      doc.moveTo(rx, y).lineTo(PAGE_W - M, y).lineWidth(0.9).strokeColor(INK).stroke();
      if (block.rightNameKey && data[block.rightNameKey]) {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(NAVY);
        doc.text(String(data[block.rightNameKey]), rx, y + 3, { width: PAGE_W - M - rx, align: "center", lineBreak: false });
      }
      fontLabel(doc);
      doc.text(block.rightLabel, rx, y + (block.rightNameKey && data[block.rightNameKey] ? 16 : 3), { width: PAGE_W - M - rx, align: "left" });
    }
    doc.y = y + 42;
    if (block.withDate) {
      const dateY = doc.y;
      fontLabel(doc);
      doc.text("Date:", M, dateY + 3, { lineBreak: false });
      doc.moveTo(M + 34, dateY).lineTo(M + 200, dateY).lineWidth(0.9).strokeColor(INK).stroke();
      doc.y = dateY + 18;
    }
    doc.y += 10;
    doc.x = M;
  }
}

// ---------- supervisor footer (CNF) ----------

function drawSupervisor(ctx: Ctx, drawHeader: (doc: PDFKit.PDFDocument) => void) {
  const { doc, template } = ctx;
  if (!template.supervisor) return;
  ensureSpace(ctx, 90, drawHeader);
  doc.y += 8;
  const roleY = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor(INK);
  doc.text(template.supervisor.role, M, roleY, { lineBreak: false });
  const nameY = roleY + 14;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NAVY);
  doc.text(template.supervisor.name, M, nameY, { lineBreak: false });
  const lineY = nameY + 30;
  doc.moveTo(M, lineY).lineTo(M + 230, lineY).lineWidth(0.9).strokeColor(INK).stroke();
  doc.y = lineY + 16;
  doc.x = M;
}

// ============================================================
// Entry point
// ============================================================

export async function generateFormPdf(template: FormTemplate, data: FormData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 36, // keep pdfkit's auto page-break boundary aligned with our M=36 layout
    bufferPages: true, // keep all pages buffered so footers can be retro-drawn with page numbers
    info: { Title: `${template.docId} — ${template.title}`, Author: template.company },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  // stash values for the header renderer
  (doc as unknown as { _formTitle: string })._formTitle = template.title;
  (doc as unknown as { _formMeta: { label: string; value: string }[] })._formMeta = template.meta;
  (doc as unknown as { _formCompany: string })._formCompany = template.company;

  const ctx: Ctx = { doc, data, template };
  const drawHdr = (d: PDFKit.PDFDocument) => drawHeader(d);

  drawHeader(doc);
  doc.y = M + HEADER_H + 17 + 14;

  const isLeave = template.id === "leave-application";

  for (const section of template.sections) {
    if (isLeave && section.heading === "TYPE OF LEAVE APPLIED FOR") {
      // skip the flat fields; rendered as the official table below
      for (const f of section.fields) void f;
      drawLeaveTable(ctx, drawHdr);
      continue;
    }
    if (isLeave && section.heading === "ABSENCE WITHOUT ACCRUAL OF BENEFITS") {
      drawAbsenceTable(ctx, drawHdr);
      continue;
    }
    if (isLeave && section.heading?.startsWith("PAYMENTS REQUIRED")) {
      drawPayments(ctx, drawHdr);
      continue;
    }
    if (isLeave && section.heading === "FULL ADDRESS WHILE ON LEAVE") {
      // address renders as part of generic loop, fine
    }

    if (section.heading) {
      ensureSpace(ctx, 40, drawHdr);
      const bannerY = doc.y;
      doc.rect(M, bannerY, CONTENT_W, 16).fill(NAVY);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
      doc.text(section.heading, M + 8, bannerY + 4, { lineBreak: false, characterSpacing: 0.5 });
      doc.y = bannerY + 22;
      doc.x = M;
      void CYAN;
    }
    if (section.note) {
      ensureSpace(ctx, 30, drawHdr);
      const noteY = doc.y;
      doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#5a6a8c");
      doc.text(section.note, M, noteY, { width: CONTENT_W });
      doc.y = noteY + doc.heightOfString(section.note, { width: CONTENT_W }) + 6;
      doc.x = M;
    }

    // hide the per-leave-type flat helper fields — they're inside the table
    const skipKeys = new Set<string>(
      isLeave
        ? LEAVE_ROWS.flatMap((r) => [`${r.prefix}Opts`, `${r.prefix}Applied`, `${r.prefix}From`, `${r.prefix}To`, `${r.prefix}Days`, `${r.prefix}Credit`])
        : []
    );

    for (const field of section.fields) {
      if (skipKeys.has(field.key)) continue;
      drawField(ctx, field, drawHdr);
    }
  }

  // footer extra fields (MLAF OUTLOOK / VIP)
  if (template.footerFields?.length) {
    ensureSpace(ctx, 40, drawHdr);
    doc.y += 6;
    const footY = doc.y;
    const colW = (CONTENT_W - 40) / template.footerFields.length;
    let fx = M;
    for (const ff of template.footerFields) {
      doc.moveTo(fx, footY).lineTo(fx + colW - 24, footY).lineWidth(0.9).strokeColor(INK).stroke();
      fontLabel(doc);
      doc.text(`${ff.label}:  ${String(data[ff.key] ?? "")}`, fx, footY + 3, { lineBreak: false });
      fx += colW + 20;
    }
    doc.y = footY + 26;
    doc.x = M;
  }

  drawSignBlocks(ctx, drawHdr);
  drawSupervisor(ctx, drawHdr);

  // generated stamp
  if (doc.y + 40 > PAGE_H - M - FOOTER_ZONE) {
    doc.addPage();
    drawHeader(doc);
    doc.y = HEADER_H + M + 22;
  }
  doc.font("Helvetica-Oblique").fontSize(7).fillColor("#6a7a99");
  doc.text(
    `Digitally filled via Management System on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}. Print, sign and send to the client or employee.`,
    M, doc.y + 6, { width: CONTENT_W }
  );

  // footers on every page with correct numbering (retro-drawn over buffered pages)
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    drawFooter(ctx, i, range.count);
  }
  doc.end();
  return done;
}
