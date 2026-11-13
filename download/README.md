# WorkHub — Manager Dashboard

A unified manager workspace that runs as both a **web app** and an installable **PWA (APK-style)** on Android, designed to be as useful as Smartsheet for cross-team operations.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Live KPIs, charts (hours, fleet, complaints), recent activity lists |
| **Employees** | Directory with search, department/status filters, add/edit/delete |
| **Timesheets** | Quick clock in/out, manual entries, approve/reject pending hours |
| **Leave** | Submit requests (annual / sick / unpaid / emergency / maternity), approve / reject |
| **Complaints** | File, filter by status/priority/category, investigate, resolve with notes |
| **Loans** | Issue loans with interest & term, pay installments, track outstanding balance |
| **Fleet** | Vehicle registry (cars/vans/trucks/motorcycles), trip logs with odometer + fuel cost |
| **Weekly Reports** | Auto-generated operational summaries, export to text |
| **Sheets** | Smartsheet-style grids — custom columns (text/number/select/date), CSV export |

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
prisma/schema.prisma         — database schema (Employee, Timesheet, Leave, Complaint, Loan, Vehicle, FleetLog, WeeklyReport, Sheet)
scripts/seed.ts              — realistic demo data (12 employees, 7 vehicles, ~50 trips, sheets, reports)
src/app/api/                 — REST endpoints for every module
src/components/views/        — one file per module (dashboard, employees, ...)
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
