# Management System & Employee App

A unified manager workspace for **Management System** that runs as both a **web app** and an installable **PWA (APK-style)** on Android, designed to be as useful as Smartsheet for cross-team operations — plus a dedicated **Employee App** where staff check their payslips, leave approvals and personal info.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Live KPIs, charts (hours, fleet, complaints), recent activity lists, fleet alerts banner |
| **Employees** | Directory with search, department/status filters, add/edit/delete |
| **Timesheets** | Quick clock in/out, manual entries, approve/reject pending hours |
| **Leave** | Submit requests (annual / sick / unpaid / emergency / maternity), approve / reject |
| **Complaints** | File, filter by status/priority/category, investigate, resolve with notes |
| **Loans** | Issue loans with interest & term, pay installments, track outstanding balance |
| **Payroll** | **Monthly payslip run** — generate payslips for all employees in one click (computed from salary, approved timesheet hours at 1.5× overtime rate, transport allowances, performance bonuses, and active staff-loan installments; deductions = PAYE 12% + social security + pension). Add slips manually, review gross/deductions/net per period, download branded PDFs, delete slips. Issued slips **appear instantly in each employee's app** |
| **Employee App** | A standalone **Android-style self-service portal** (`/?app=employee`, also in the PWA shortcuts and the sidebar “Employee App” button). Staff sign in with **employee number or email + PIN** (default PIN = last 4 digits of the employee number) and get: **Home** (latest payslip with net pay + one-tap PDF download, live leave-approval status, loan balance, quick stats), **Payslips** (query by year/month/free-text and open any slip's earnings/deductions breakdown, download as branded PDF), **Leave** (approval status of every request in color-coded badges + submit new requests straight to the manager), **Profile** (personal info, base salary, staff loan, year-to-date totals, sign-out) |
| **Fleet** | Vehicle registry with **purchase data** (price, date, VIN, supplier, insurance & registration expiry), **weekly driver inspections** (10-point checklist that auto-flags the fleet controller on warning/fail), **service history** with parts replaced (oil, filters, tires, brake pads, batteries), **recurring maintenance schedule** (oil change, wheel rotation, brake inspection, etc.) with **overdue / due-soon / OK** status, and a per-vehicle **history timeline** drawer combining inspections + services |
| **Factory Reports** | Multi-site daily operational reports (e.g. MANAGEMENT SYSTEM · CLEANING). Each report covers multiple sites (HANGANA, BHL, BACHMUS, DEEP OCEAN, PEREIRA) with categorized action items: **Cleaning Findings, Machinery, Personnel, PPE/Equipment, Other**. Every item tracks description, action needed, responsible person, and status (open / in-progress / resolved). Export to text format that matches the original report layout. |
| **Company Forms** | The five **official company paper forms** digitized — fill them in on screen and **download as a branded PDF** ready to print, sign and send to a client or employee. Includes the full doc-control header (REV/DATE, DOC. NAME, REVIEW NR, CREATED BY, APPROVED BY), navy section banners, YES/NO tick boxes, the leave-table layout, signature lines and page numbers:
  - **MS-CW-IR-01 · Incident Report Form** (MANAGEMENT SYSTEM · CAR WASH)
  - **MS-ARF-2024 · Accident Report Form** (MANAGEMENT SYSTEM) — driver details, accident details, damage, witnesses
  - **MS-CCF-01 · Customer Complaint Form** (MANAGEMENT SYSTEM)
  - **MS-CNF-2024 · Customer Notification Form** (MANAGEMENT SYSTEM · CLEANING) — with purpose blurb & quality-supervisor sign-off
  - **MS-MLAF-01 · Multi Leave Application Form** (MANAGEMENT SYSTEM · CLEANING) — 6 leave types, unpaid/AWOL table, payments required |
| **Weekly Reports** | Auto-generated operational summaries, export to text |
| **Sheets** | Smartsheet-style grids — custom columns (text/number/select/date), CSV export |

## Payslip PDF

- Branded A4 document generated server-side with pdfkit: navy header with the brand mark, employee info grid, side-by-side **Earnings / Deductions** tables, highlighted **NET PAY** banner, **year-to-date** totals, declaration and HR contact line.
- Filename: `Payslip_<Name>_<YYYY-MM>.pdf` — opens in a new tab for printing/saving, or can be sent to the employee or a client (e.g. bank proof of income).
- Employees can only fetch their **own** slips (ownership check on the PDF endpoint).

## Company Forms highlights

- **Faithful to the originals** — each PDF reproduces the paper document: logo header, doc-control table, company strip, section banners, fill-in boxes, checkboxes, signature lines and date fields.
- **Auto document IDs** — new forms are pre-filled with the next sequential ID (e.g. `IR-2026-0002`, `CC-2026-0001`).
- **Required-field validation** — the Save buttons stay disabled until the mandatory fields (marked `*`) are filled.
- **Save & download PDF** — one click saves the submission and downloads the branded PDF (filename like `MS-CW-IR-01_IR-2026-0001.pdf`).
- **Printed signatory names** — optional name fields appear under the signature lines for sending documents without printing names by hand.
- **Edit anytime** — reopen any saved form, update it and re-download the PDF.

## Fleet module highlights

- **Weekly inspection form** — driver picks vehicle, fills a 10-item checklist (tires, brakes, lights, fluids, wipers, body, seatbelts, horn, exhaust, steering). Each item: ✓ OK / ⚠ Warning / ✕ Fail + notes.
- **Auto-flagging** — any Warning or Fail automatically marks the inspection as **flagged**, sets the vehicle status to **maintenance**, and surfaces a notification to the fleet controller. The controller can then **Acknowledge** the flag.
- **Service log** — every oil change, wheel rotation, brake job, tire replacement, battery swap, filter change is recorded with: date, mileage, cost, mechanic, supplier, **parts replaced** (line items with qty & cost), free-text notes.
- **Maintenance schedule** — recurring tasks per vehicle with mileage and/or time intervals. The system auto-computes **next due date / mileage**, displays **Overdue / Due-soon / OK** badges, and a **Mark done** action that records completion and recalculates the next due.
- **Vehicle purchase data** — every vehicle tracks purchase price, purchase date, supplier, VIN, color, and insurance + registration expiry dates.
- **Per-vehicle history** — a slide-out drawer shows quick stats, full purchase & registration details, upcoming maintenance, and a unified timeline of inspections + services in chronological order.

## Design system

- **Brand palette (from the Management System logo):** deep navy `#01205E` (sidebar, primary buttons, wordmark) + brand cyan `#00AEEF` (water-drop accent, active nav items, charts)
- **Logo:** custom SVG mark — two cupped hands holding a water drop — in the sidebar, mobile nav, and PWA icons
- **Accents:** cyan, emerald, amber, rose, violet, orange — used for status badges and chart series
- **Light & dark themes** with refined contrast and navy sidebar
- **Card hover lift** and cyan→navy gradient hero for tactile feel
- **Responsive** — desktop sidebar, mobile hamburger sheet + bottom nav

## Install as an app (PWA / APK-style)

1. Open the app in Chrome (desktop or Android).
2. Use the browser's **"Install app"** / **"Add to Home Screen"** option.
3. On Android it appears as a standalone app icon and launches in fullscreen — behaves like a native APK.

The manifest, icons (192px, 512px, apple-touch-icon), and standalone display mode are all configured in `public/manifest.webmanifest`.

## Tech stack

- Next.js 16 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui (New York style)
- Prisma ORM + SQLite
- Recharts for visualizations
- Zustand for UI state, next-themes for dark/light mode
- Sonner + Radix toasts

## Project structure

```
prisma/schema.prisma         — 15 models: Employee (with portal PIN), Timesheet, LeaveRequest, Complaint, Loan,
                                Payslip, Vehicle (with purchase data), FleetLog, VehicleInspection,
                                ServiceRecord, MaintenanceSchedule, FactoryReport, WeeklyReport, Sheet,
                                FormSubmission, Setting
scripts/seed.ts              — realistic demo data: 12 employees, 7 vehicles, ~50 trips,
                                23 inspections, 29 service records, 35 maintenance schedules,
                                36+ payslips (last 3 months)
src/app/api/portal/          — employee-app endpoints: login (PIN), me, payslips (query),
                                payslips/[id]/pdf (branded PDF), leave
src/app/api/payslips/        — manager payroll: list, generate month, create, update, delete
src/lib/payroll.ts           — payslip computation engine (overtime, allowances, loans, deductions)
src/lib/payslip-pdf.ts       — branded payslip PDF generator
src/components/views/employee-portal.tsx — the Employee App (login + 4 tabs)
src/components/views/payroll.tsx — manager Payroll UI
src/components/{sidebar,topbar,mobile-nav,app-shell}.tsx — layout
src/lib/store.ts             — Zustand UI state (active section, sidebar, mobile nav)
```

## Employee App demo credentials

| Employee | Employee number | PIN |
| --- | --- | --- |
| Marcus Reyes | `MS-1002` | `1002` |
| Sarah Chen | `MS-1001` | `1001` |
| …any employee | `MS-10XX` | `10XX` (last 4 digits of the number) |

## Dev commands

- `bun run dev` — start the Next.js dev server (port 3000)
- `bun run db:push` — push schema to SQLite
- `bun run scripts/seed.ts` — re-seed demo data
- `bun run lint` — ESLint

## Reset demo data

Use the **Reset demo data** button in the topbar (or `POST /api/seed`) to wipe and re-seed the database at any time.
