// ============================================================
// Management System — employee payslip PDF generator.
// Branded A4 document: navy header with logo, employee info
// grid, earnings / deductions tables, highlighted net pay,
// year-to-date summary. Matches the "Deep Water" brand system.
//
// NOTE: pdfkit's doc.text(x, y) advances doc.y as a side effect,
// so this layout uses ONE explicit y cursor instead of doc.y.
// ============================================================
import PDFDocument from "pdfkit";
import path from "path";

const NAVY = "#01205E";
const CYAN = "#00AEEF";
const INK = "#1a2233";
const LINE = "#5a6a8c";
const LIGHT = "#c9d4e8";
const FAINT = "#6a7a99";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const M = 36;
const CONTENT_W = PAGE_W - M * 2;

export interface PayslipLine {
  label: string;
  amount: number;
  kind: "earning" | "deduction";
}

export interface PayslipPdfInput {
  periodLabel: string;
  payDate: string;
  employee: {
    name: string;
    employeeNo: string;
    position: string;
    department: string;
    email: string;
    phone: string;
    hireDate: string;
    bankRef: string;
  };
  hours: number;
  gross: number;
  deductions: number;
  net: number;
  baseSalary: number;
  notes?: string | null;
  earnings: PayslipLine[];
  deductionLines: PayslipLine[];
  ytd: { gross: number; tax: number; net: number };
}

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function generatePayslipPdf(input: PayslipPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: M,
    info: {
      Title: `Payslip ${input.periodLabel} — ${input.employee.name}`,
      Author: "Management System",
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks))),
  );

  // ---------- header (fixed positions) ----------
  const HEADER_H = 64;
  const hy = M;
  doc.rect(M, hy, CONTENT_W, HEADER_H).lineWidth(1.2).strokeColor(NAVY).stroke();

  const logoW = 96;
  doc.moveTo(M + logoW, hy).lineTo(M + logoW, hy + HEADER_H).lineWidth(1.2).strokeColor(NAVY).stroke();
  try {
    doc.image(path.join(process.cwd(), "public", "brand-mark.png"), M + (logoW - 40) / 2, hy + 5, {
      width: 40,
      height: 40,
    });
  } catch {
    /* logo optional */
  }
  doc.font("Helvetica-Bold").fontSize(7).fillColor(NAVY);
  doc.text("MANAGEMENT SYSTEM", M, hy + HEADER_H - 16, { width: logoW, align: "center", lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(17).fillColor(NAVY);
  doc.text("PAYSLIP", M + logoW + 12, hy + 12, { width: 210, align: "left", lineBreak: false });
  doc.font("Helvetica").fontSize(9.5).fillColor(FAINT);
  doc.text(input.periodLabel, M + logoW + 12, hy + 36, { width: 210, align: "left", lineBreak: false });

  const metaRows: Array<[string, string]> = [
    ["EMPLOYEE NO.", input.employee.employeeNo],
    ["PAY DATE", input.payDate],
    ["DEPARTMENT", input.employee.department],
  ];
  const metaX = PAGE_W - M - 170;
  metaRows.forEach(([label, value], i) => {
    const ry = hy + 9 + i * 17;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(FAINT);
    doc.text(label, metaX, ry, { width: 76, align: "left", lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK);
    doc.text(value, metaX + 78, ry - 1, { width: 92, align: "right", lineBreak: false });
  });

  // navy strip
  const stripY = hy + HEADER_H;
  doc.rect(M, stripY, CONTENT_W, 16).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
  doc.text(
    "MANAGEMENT SYSTEM  ·  HUMAN RESOURCES  ·  EMPLOYEE COMPENSATION STATEMENT",
    M,
    stripY + 4.5,
    { width: CONTENT_W, align: "center", lineBreak: false, characterSpacing: 0.4 },
  );

  // ---------- explicit y cursor ----------
  let y = stripY + 16 + 16;

  // ---------- employee info grid ----------
  const infoRows: Array<[string, string]> = [
    ["EMPLOYEE NAME", input.employee.name],
    ["POSITION", input.employee.position],
    ["DEPARTMENT", input.employee.department],
    ["DATE JOINED", input.employee.hireDate],
    ["CONTACT", input.employee.email + (input.employee.phone ? `  ·  ${input.employee.phone}` : "")],
    ["PAYMENT REF", input.employee.bankRef],
  ];
  const infoH = infoRows.length * 17 + 8;
  doc.rect(M, y, CONTENT_W, infoH).lineWidth(0.8).strokeColor(LIGHT).fillAndStroke("#f7f9fd", LINE);
  infoRows.forEach(([label, value], i) => {
    const iy = y + 7 + i * 17;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(FAINT);
    doc.text(label, M + 10, iy, { width: 120, lineBreak: false, characterSpacing: 0.3 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
    doc.text(value, M + 140, iy - 1, { width: CONTENT_W - 150, lineBreak: false });
  });
  y += infoH + 14;

  // ---------- earnings / deductions tables ----------
  const colW = (CONTENT_W - 16) / 2;
  const rowH = 17;
  const tableRows = Math.max(input.earnings.length, input.deductionLines.length, 1);
  const bannerH = 18;
  const tableH = bannerH + (tableRows + 1) * rowH + 2;

  function drawTable(x: number, title: string, lines: PayslipLine[], total: number, totalLabel: string) {
    doc.rect(x, y, colW, bannerH).fill(NAVY);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    doc.text(title, x + 8, y + 5, { lineBreak: false, characterSpacing: 0.5 });

    let ry = y + bannerH;
    for (const l of lines) {
      doc.rect(x, ry, colW, rowH).lineWidth(0.7).strokeColor(LIGHT).stroke();
      doc.font("Helvetica").fontSize(8.2).fillColor(INK);
      doc.text(l.label, x + 8, ry + 4.5, { width: colW - 100, lineBreak: false, ellipsis: true });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(NAVY);
      doc.text(money(l.amount), x + colW - 92, ry + 4.5, { width: 84, align: "right", lineBreak: false });
      ry += rowH;
    }
    // pad short columns so both tables end together
    while (ry < y + bannerH + tableRows * rowH) {
      doc.rect(x, ry, colW, rowH).lineWidth(0.7).strokeColor(LIGHT).stroke();
      ry += rowH;
    }
    doc.rect(x, ry, colW, rowH + 2).lineWidth(1).strokeColor(NAVY).fillAndStroke("#e8f4fb", NAVY);
    doc.font("Helvetica-Bold").fontSize(8.8).fillColor(NAVY);
    doc.text(totalLabel, x + 8, ry + 5.5, { lineBreak: false });
    doc.text(money(total), x + colW - 92, ry + 5.5, { width: 84, align: "right", lineBreak: false });
  }

  drawTable(M, "EARNINGS", input.earnings, input.gross, "GROSS PAY");
  drawTable(M + colW + 16, "DEDUCTIONS", input.deductionLines, input.deductions, "TOTAL DEDUCTIONS");
  y += tableH + 12;

  // ---------- period facts line ----------
  doc.font("Helvetica").fontSize(8).fillColor(FAINT);
  doc.text(
    `Paid hours for period: ${input.hours.toLocaleString(undefined, { maximumFractionDigits: 2 })}   ·   Base salary: ${money(input.baseSalary)}`,
    M,
    y,
    { width: CONTENT_W, lineBreak: false },
  );
  y += 22;

  // ---------- net pay banner ----------
  doc.rect(M, y, CONTENT_W, 44).fill(NAVY);
  doc.rect(M, y, 6, 44).fill(CYAN);
  doc.font("Helvetica-Bold").fontSize(7.8).fillColor("#9fc8ea");
  doc.text("NET PAY — TRANSFERRED TO EMPLOYEE", M + 22, y + 7, { lineBreak: false, characterSpacing: 0.6 });
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#ffffff");
  doc.text(money(input.net), M + 22, y + 17, { lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor("#9fc8ea");
  doc.text(input.periodLabel, PAGE_W - M - 150, y + 17, { width: 128, align: "right", lineBreak: false });
  y += 44 + 16;

  // ---------- YTD summary ----------
  const ytdH = 54;
  doc.rect(M, y, CONTENT_W, ytdH).lineWidth(0.9).strokeColor(LIGHT).fillAndStroke("#f7f9fd", LINE);
  const ytdCols: Array<[string, string]> = [
    ["GROSS EARNINGS (YTD)", money(input.ytd.gross)],
    ["TAX & SOCIAL (YTD)", money(input.ytd.tax)],
    ["NET RECEIVED (YTD)", money(input.ytd.net)],
  ];
  const cw = CONTENT_W / 3;
  ytdCols.forEach(([label, value], i) => {
    const cx = M + i * cw;
    if (i > 0) {
      doc.moveTo(cx, y).lineTo(cx, y + ytdH).lineWidth(0.6).strokeColor(LIGHT).stroke();
    }
    doc.font("Helvetica-Bold").fontSize(6.8).fillColor(FAINT);
    doc.text(label, cx + 12, y + 11, { lineBreak: false, characterSpacing: 0.4 });
    doc.font("Helvetica-Bold").fontSize(13).fillColor(NAVY);
    doc.text(value, cx + 12, y + 26, { lineBreak: false });
  });
  y += ytdH + 14;

  // ---------- notes + declaration ----------
  if (input.notes) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(INK);
    doc.text(`Note: ${input.notes}`, M, y, { width: CONTENT_W });
    y += doc.heightOfString(`Note: ${input.notes}`, { width: CONTENT_W }) + 8;
  }

  const declaration =
    "This payslip is computer generated and requires no signature. It summarises gross earnings, statutory and voluntary deductions, and net pay for the stated period. Keep it for your records; it is accepted as proof of income by banks and institutions.";
  doc.font("Helvetica").fontSize(7.5).fillColor(FAINT);
  doc.text(declaration, M, y, { width: CONTENT_W });
  y += doc.heightOfString(declaration, { width: CONTENT_W }) + 12;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY);
  doc.text("Queries? Contact HR: hr@managementsystem.com  ·  +1 555 0105", M, y, {
    width: CONTENT_W,
    lineBreak: false,
  });

  // ---------- footer on all pages ----------
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = PAGE_H - M - 12;
    doc.font("Helvetica").fontSize(7).fillColor(FAINT);
    doc.text(
      `Management System · Payslip ${input.periodLabel} · ${input.employee.name} (${input.employee.employeeNo})`,
      M,
      fy,
      { width: CONTENT_W - 90, lineBreak: false },
    );
    doc.text(`Page ${i + 1} of ${range.count}`, PAGE_W - M - 80, fy, {
      width: 80,
      align: "right",
      lineBreak: false,
    });
  }

  void CYAN;
  void INK;
  doc.end();
  return done;
}
