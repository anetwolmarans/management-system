# WorkHub — Manager Dashboard

A unified manager workspace that runs as both a **web app** and an installable **PWA (APK-style)** on Android, designed to be as useful as Smartsheet for cross-team operations.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Live KPIs, charts (hours, fleet, complaints), recent activity lists, fleet alerts banner |
| **Employees** | Directory with search, department/status filters, add/edit/delete |
| **Timesheets** | Quick clock in/out, manual entries, approve/reject pending hours |
| **Leave** | Submit requests (annual / sick / unpaid / emergency / maternity), approve / reject |
| **Complaints** | File, filter by status/priority/category, investigate, resolve with notes |
| **Loans** | Issue loans with interest & term, pay installments, track outstanding balance |
| **Fleet** | Vehicle registry with **purchase data** (price, date, VIN, supplier, insurance & registration expiry), **weekly driver inspections** (10-point checklist that auto-flags the fleet controller on warning/fail), **service history** with parts replaced (oil, filters, tires, brake pads, batteries), **recurring maintenance schedule** (oil change, wheel rotation, brake inspection, etc.) with **overdue / due-soon / OK** status, and a per-vehicle **history timeline** drawer combining inspections + services |
| **Factory Reports** | Multi-site daily operational reports (e.g. BAYWASH CLEANING). Each report covers multiple sites (HANGANA, BHL, BACHMUS, DEEP OCEAN, PEREIRA) with categorized action items: **Cleaning Findings, Machinery, Personnel, PPE/Equipment, Other**. Every item tracks description, action needed, responsible person, and status (open / in-progress / resolved). Export to text format that matches the original report layout. |
| **Weekly Reports** | Auto-generated operational summaries, export to text |
| **Sheets** | Smartsheet-style grids — custom columns (text/number/select/date), CSV export |

## Fleet module highlights

- **Weekly inspection form** — driver picks vehicle, fills a 10-item checklist (tires, brakes, lights, fluids, wipers, body, seatbelts, horn, exhaust, steering). Each item: ✓ OK / ⚠ Warning / ✕ Fail + notes.
- **Auto-flagging** — any Warning or Fail automatically marks the inspection as **flagged**, sets the vehicle status to **maintenance**, and surfaces a notification to the fleet controller. The controller can then **Acknowledge** the flag.
- **Service log** — every oil change, wheel rotation, brake job, tire replacement, battery swap, filter change is recorded with: date, mileage, cost, mechanic, supplier, **parts replaced** (line items with qty & cost), free-text notes.
- **Maintenance schedule** — recurring tasks per vehicle with mileage and/or time intervals. The system auto-computes **next due date / mileage**, displays **Overdue / Due-soon / OK** badges, and a **Mark done** action that records completion and recalculates the next due.
- **Vehicle purchase data** — every vehicle tracks purchase price, purchase date, supplier, VIN, color, and insurance + registration expiry dates.
- **Per-vehicle history** — a slide-out drawer shows quick stats, full purchase & registration details, upcoming maintenance, and a unified timeline of inspections + services in chronological order.

## Design system

- **Primary palette:** deep teal (`oklch(0.48 0.10 200)`) — professional, fleet-friendly, distinctive
- **Accents:** cyan, emerald, amber, rose, violet, orange — used for status badges and chart series
- **Light & dark themes** with refined contrast and tinted sidebar
- **Card hover lift** and gradient header bar for tactile feel
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
prisma/schema.prisma         — 11 models: Employee, Timesheet, LeaveRequest, Complaint, Loan,
                                Vehicle (with purchase data), FleetLog, VehicleInspection,
                                ServiceRecord, MaintenanceSchedule, WeeklyReport, Sheet, Setting
scripts/seed.ts              — realistic demo data: 12 employees, 7 vehicles, ~50 trips,
                                23 inspections, 29 service records, 35 maintenance schedules
src/app/api/                 — REST endpoints for every module including
                                /api/fleet/{vehicles,inspections,services,maintenance}
src/components/views/fleet.tsx — Fleet UI with 4 sub-tabs and 4 dialogs
src/components/{sidebar,topbar,mobile-nav,app-shell}.tsx — layout
src/lib/store.ts             — Zustand UI state (active section, sidebar, mobile nav)
```

## Dev commands

- `bun run dev` — start the Next.js dev server (port 3000)
- `bun run db:push` — push schema to SQLite
- `bun run scripts/seed.ts` — re-seed demo data
- `bun run lint` — ESLint

## Reset demo data

Use the **Reset demo data** button in the topbar (or `POST /api/seed`) to wipe and re-seed the database at any time.
