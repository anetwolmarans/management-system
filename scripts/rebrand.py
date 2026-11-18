# Rebrand "BAYWASH Group" -> generic "Management System".
# Explicit, ordered old->new pairs (longest/most specific first). Idempotent.
import pathlib

FILES = [
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/lib/store.ts",
    "src/lib/api.ts",
    "src/lib/nav.ts",
    "src/lib/forms.ts",
    "src/lib/payslip-pdf.ts",
    "src/lib/pdf-generator.ts",
    "src/app/api/forms/route.ts",
    "src/app/api/forms/[id]/pdf/route.ts",
    "src/app/api/portal/payslips/[id]/pdf/route.ts",
    "src/components/views/forms.tsx",
    "src/components/views/payroll.tsx",
    "src/components/views/employee-portal.tsx",
    "src/components/views/dashboard.tsx",
    "src/components/views/factory-reports.tsx",
    "src/components/sidebar.tsx",
    "src/components/mobile-nav.tsx",
    "src/components/service-worker-registrar.tsx",
    "src/components/app-shell.tsx",
    "public/manifest.webmanifest",
    "public/offline.html",
    "public/sw.js",
    "scripts/seed.ts",
    "download/README.md",
]

# (old, new, files_subset_or_None_for_all)
PAIRS = [
    # --- specific phrases first ---
    ("BAYWASH Group — Manager Dashboard", "Management System", None),
    ("BAYWASH Group — unified ops dashboard", "Management System — unified ops dashboard", None),
    ("BAYWASH Group manager workspace:", "Management System — unified workspace:", None),
    ("BAYWASH Group Manager Dashboard", "Management System", None),
    ("BAYWASH Group · Employee App v1.0 · Data shown is from the BAYWASH manager dashboard",
     "Management System · Employee App v1.0 · Data shown is from the manager dashboard", None),
    ("BAYWASH Group · Employee self-service", "Management System · Employee self-service", None),
    ("BAYWASH Group · Payslip", "Management System · Payslip", None),
    ("BAYWASH Group — employee payslip PDF generator", "Management System — employee payslip PDF generator", None),
    ("BAYWASH Group — official form templates", "Management System — official company form templates", None),
    ("BAYWASH Group — official form PDF generator", "Management System — official company form PDF generator", None),
    ("Global UI state for BAYWASH Group manager workspace", "Global UI state for the Management System manager workspace", None),
    ("Shared API helpers for BAYWASH Group manager workspace routes", "Shared API helpers for Management System workspace routes", None),
    ("BAYWASH GROUP", "MANAGEMENT SYSTEM", None),
    ("BAYWASH CARWASH", "MANAGEMENT SYSTEM · CAR WASH", None),
    ("BAYWASH CLEANING", "MANAGEMENT SYSTEM · CLEANING", None),
    ("BAYWASH Group", "Management System", None),
    ("BAYWASH Employee App — Android-style portal", "Employee App — Android-style self-service portal", None),
    ('leading-none">BAYWASH<', 'leading-none">Management System<', None),
    ('text-[15px] tracking-wide text-white">BAYWASH<', 'text-[14px] tracking-wide text-white">Management System<', None),
    ('text-[#01205E]">BAYWASH<', 'text-[#01205E]">Management System<', None),
    ("Group · Manager Suite", "Manager Suite", None),
    ("the BAYWASH employee app", "the employee app", None),
    ("each employee&apos;s BAYWASH app", "each employee&apos;s app", None),
    ("Official BAYWASH documents", "Official company documents", None),
    ("official BAYWASH documents", "official company documents", None),
    ("official BAYWASH paper forms", "official company paper forms", None),
    ("Official BAYWASH company forms", "Official company forms", None),
    ("official BAYWASH PDF document", "official PDF document", None),
    ("branded BAYWASH PDF document", "branded PDF document", None),
    ("the BAYWASH mark", "the brand mark", None),
    ("BAYWASH brand chart palette", "Brand chart palette", None),
    ("BAYWASH brand", "brand", None),
    ("Baywash Quality Supervisor", "Quality Supervisor", None),
    ("hr@baywashgroup.com", "hr@managementsystem.com", None),
    ("@baywashgroup.com", "@managementsystem.com", None),
    ("BW-1002", "MS-1002", None),
    ("BWCW-IR-01", "MS-CW-IR-01", None),
    ("BWG-ARF-2024", "MS-ARF-2024", None),
    ("BWG-CCF-01", "MS-CCF-01", None),
    ("BWC-CNF-2024", "MS-CNF-2024", None),
    ("BC-MLAF-01", "MS-MLAF-01", None),
    # --- design-system comments ---
    ("BAYWASH Group Design System", "Management System Design System", None),
    ("Brand colors taken directly from the BAYWASH Group logo:", "Brand palette: deep navy & bright cyan, water-inspired:", None),
    ('the "BAYWASH" wordmark color', "the navy wordmark color", None),
    ("like the BAYWASH wordmark", "like the navy wordmark", None),
    # --- logo component rename ---
    ('import { BaywashLogo } from "@/components/baywash-logo";', 'import { BrandLogo } from "@/components/brand-logo";', None),
    ("<BaywashLogo", "<BrandLogo", None),
    # --- seed.ts quoted BW- prefixes (employee numbers, plates, companyNo) ---
    ('"BW-', '"MS-', ["scripts/seed.ts"]),
    # --- generic leftovers in comments ---
    ("BAYWASH service worker", "Management System service worker", None),
    ("BAYWASH Group needs a connection", "Management System needs a connection", None),
    ("BAYWASH Group — Offline", "Management System — Offline", None),
]

ROOT = pathlib.Path("/home/z/my-project")

for rel in FILES:
    p = ROOT / rel
    if not p.exists():
        print(f"MISSING: {rel}")
        continue
    text = p.read_text(encoding="utf-8")
    original = text
    for old, new, subset in PAIRS:
        if subset is not None and rel not in subset:
            continue
        text = text.replace(old, new)
    if text != original:
        p.write_text(text, encoding="utf-8")
        print(f"updated: {rel}")
    else:
        print(f"no change: {rel}")

print("done")
