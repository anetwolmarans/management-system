"use client";

import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Topbar } from "@/components/topbar";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/views/dashboard";
import { EmployeesView } from "@/components/views/employees";
import { TimesheetsView } from "@/components/views/timesheets";
import { LeaveView } from "@/components/views/leave";
import { ComplaintsView } from "@/components/views/complaints";
import { LoansView } from "@/components/views/loans";
import { FormsView } from "@/components/views/forms";
import { FleetView } from "@/components/views/fleet";
import { FactoryReportsView } from "@/components/views/factory-reports";
import { ReportsView } from "@/components/views/reports";
import { SheetsView } from "@/components/views/sheets";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export function AppShell() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);

  // Sync section from URL query param on mount (for PWA shortcuts)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    if (section && NAV_ITEMS.some((n) => n.id === section)) {
      setActiveSection(section as never);
    }
  }, [setActiveSection]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <MobileNav />

        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />

          <main className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className={cn("mx-auto max-w-7xl")}>
              {activeSection === "dashboard" && <DashboardView />}
              {activeSection === "employees" && <EmployeesView />}
              {activeSection === "timesheets" && <TimesheetsView />}
              {activeSection === "leave" && <LeaveView />}
              {activeSection === "complaints" && <ComplaintsView />}
              {activeSection === "loans" && <LoansView />}
              {activeSection === "forms" && <FormsView />}
              {activeSection === "fleet" && <FleetView />}
              {activeSection === "factory-reports" && <FactoryReportsView />}
              {activeSection === "reports" && <ReportsView />}
              {activeSection === "sheets" && <SheetsView />}
            </div>
          </main>

          <footer className="border-t bg-background px-4 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1">
            <span>BAYWASH Group — unified ops dashboard</span>
            <span className="text-[10px]">Tip: install to home screen for app-like access (PWA)</span>
          </footer>
        </div>
      </div>

      {/* Mobile bottom navigation — quick switcher */}
      <MobileBottomNav />
    </div>
  );
}

function MobileBottomNav() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  // Show only 5 priority items in bottom nav
  const items = NAV_ITEMS.filter((n) =>
    ["dashboard", "employees", "timesheets", "fleet", "factory-reports"].includes(n.id),
  );

  return (
    <nav className="md:hidden sticky bottom-0 z-30 bg-[color:var(--sidebar)] safe-bottom shadow-[0_-2px_10px_rgba(1,32,94,0.25)]">
      <div className="grid grid-cols-5 px-1 pt-1.5 pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="flex flex-col items-center gap-0.5 py-1 px-0.5"
            >
              <span
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full transition-all",
                  active
                    ? "bg-[color:var(--sidebar-primary)] text-[color:var(--sidebar-primary-foreground)] shadow-md scale-105"
                    : "text-white/70",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "text-[9px] font-bold tracking-wide truncate max-w-full",
                  active ? "text-[color:var(--sidebar-primary)]" : "text-white/55",
                )}
              >
                {item.short}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
