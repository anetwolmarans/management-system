"use client";

import { useEffect, useState, useCallback } from "react";
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
import { PayrollView } from "@/components/views/payroll";
import { FormsView } from "@/components/views/forms";
import { FleetView } from "@/components/views/fleet";
import { FactoryReportsView } from "@/components/views/factory-reports";
import { ReportsView } from "@/components/views/reports";
import { SheetsView } from "@/components/views/sheets";
import { WarningsView } from "@/components/views/warnings";
import { OperationsOverview } from "@/components/views/operations-overview";
import { ManagerLogin, getManagerSession, clearManagerSession, type ManagerSession } from "@/components/manager-login";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AppShell() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const [session, setSession] = useState<ManagerSession | null>(null);
  const [checking, setChecking] = useState(true);

  // Restore session from localStorage on mount.
  useEffect(() => {
    Promise.resolve().then(() => {
      setSession(getManagerSession());
      setChecking(false);
    });
  }, []);

  // Legacy ?app=employee redirects to /portal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("app") === "employee") {
      window.location.replace("/portal");
      return;
    }
    const section = params.get("section");
    if (section && NAV_ITEMS.some((n) => n.id === section)) {
      setActiveSection(section as never);
    }
  }, [setActiveSection]);

  const signOut = useCallback(async () => {
    if (session?.token) {
      fetch("/api/auth/logout", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => undefined);
    }
    clearManagerSession();
    setSession(null);
    setActiveSection("dashboard");
    toast.success("Signed out");
  }, [session, setActiveSection]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Auth gate — show the manager login screen if not signed in.
  if (!session) {
    return <ManagerLogin onSignedIn={setSession} />;
  }

  const role = session.employee.role;

  // If the active section isn't available for this role, fall back to dashboard.
  const visibleItems = NAV_ITEMS.filter((n) => !n.roles || n.roles.includes(role));
  const activeVisible = visibleItems.some((n) => n.id === activeSection);
  const effectiveSection = activeVisible ? activeSection : "dashboard";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <Sidebar
          role={role}
          managerName={session.employee.name}
          managerRole={role}
          onSignOut={signOut}
        />
        <MobileNav role={role} />

        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />

          <main className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className={cn("mx-auto max-w-7xl")}>
              {effectiveSection === "dashboard" && <DashboardView />}
              {effectiveSection === "operations" && role === "owner" && <OperationsOverview />}
              {effectiveSection === "employees" && <EmployeesView />}
              {effectiveSection === "timesheets" && <TimesheetsView />}
              {effectiveSection === "leave" && <LeaveView />}
              {effectiveSection === "complaints" && <ComplaintsView />}
              {effectiveSection === "warnings" && <WarningsView />}
              {effectiveSection === "loans" && <LoansView />}
              {effectiveSection === "payroll" && <PayrollView />}
              {effectiveSection === "forms" && <FormsView />}
              {effectiveSection === "fleet" && <FleetView />}
              {effectiveSection === "factory-reports" && <FactoryReportsView />}
              {effectiveSection === "reports" && <ReportsView />}
              {effectiveSection === "sheets" && <SheetsView />}
            </div>
          </main>

          <footer className="border-t bg-background px-4 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1">
            <span>Management System — {role === "owner" ? "Owner" : "Manager"} Suite</span>
            <button onClick={signOut} className="text-[10px] underline hover:text-foreground">
              Sign out ({session.employee.name})
            </button>
          </footer>
        </div>
      </div>

      <MobileBottomNav role={role} />
    </div>
  );
}

function MobileBottomNav({ role }: { role: string }) {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const items = NAV_ITEMS.filter(
    (n) =>
      (!n.roles || n.roles.includes(role)) &&
      ["dashboard", "employees", "timesheets", "fleet", "factory-reports"].includes(n.id),
  );
  // If operations is available (owner), swap out factory-reports for it.
  const finalItems = role === "owner"
    ? items.map((n) => (n.id === "factory-reports" ? NAV_ITEMS.find((n2) => n2.id === "operations")! : n))
    : items;

  return (
    <nav className="md:hidden sticky bottom-0 z-30 bg-[color:var(--sidebar)] safe-bottom shadow-[0_-2px_10px_rgba(1,32,94,0.25)]">
      <div className="grid grid-cols-5 px-1 pt-1.5 pb-1">
        {finalItems.map((item) => {
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
