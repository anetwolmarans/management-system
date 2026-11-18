// Global UI state for BAYWASH Group manager workspace — active section + sidebar state.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SectionId =
  | "dashboard"
  | "employees"
  | "timesheets"
  | "leave"
  | "complaints"
  | "loans"
  | "payroll"
  | "forms"
  | "fleet"
  | "factory-reports"
  | "reports"
  | "sheets"
  | "employee-portal";

interface AppState {
  activeSection: SectionId;
  setActiveSection: (s: SectionId) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeSection: "dashboard",
      setActiveSection: (s) => set({ activeSection: s, mobileNavOpen: false }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      mobileNavOpen: false,
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
    }),
    {
      name: "workhub-ui",
      partialize: (s) => ({ activeSection: s.activeSection, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
