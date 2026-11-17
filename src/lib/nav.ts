// Navigation configuration — single source of truth for the sidebar + mobile nav.
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  MessageSquareWarning,
  Banknote,
  FileStack,
  Truck,
  FileBarChart,
  Factory,
  Table2,
  type LucideIcon,
} from "lucide-react";
import type { SectionId } from "@/lib/store";

export interface NavItem {
  id: SectionId;
  label: string;
  short: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard, description: "KPIs & overview" },
  { id: "employees", label: "Employees", short: "Staff", icon: Users, description: "Directory & profiles" },
  { id: "timesheets", label: "Timesheets", short: "Hours", icon: Clock, description: "Clock in/out & hours" },
  { id: "leave", label: "Leave", short: "Leave", icon: CalendarDays, description: "Requests & approvals" },
  { id: "complaints", label: "Complaints", short: "Cases", icon: MessageSquareWarning, description: "Issues & resolutions" },
  { id: "loans", label: "Loans", short: "Loans", icon: Banknote, description: "Advances & installments" },
  { id: "forms", label: "Company Forms", short: "Forms", icon: FileStack, description: "Official BAYWASH documents — fill in & export PDF" },
  { id: "fleet", label: "Fleet", short: "Fleet", icon: Truck, description: "Vehicles, inspections & maintenance" },
  { id: "factory-reports", label: "Factory Reports", short: "Sites", icon: Factory, description: "Daily multi-site operational reports" },
  { id: "reports", label: "Weekly Reports", short: "Reports", icon: FileBarChart, description: "Operations summaries" },
  { id: "sheets", label: "Sheets", short: "Sheets", icon: Table2, description: "Custom grids (Smartsheet-style)" },
];
