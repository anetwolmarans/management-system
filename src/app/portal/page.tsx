// Employee self-service portal — standalone route, no manager chrome.
// Employees land here directly to log in and see their profile, leave,
// warnings, payslips and loan status.
import { EmployeePortal } from "@/components/views/employee-portal";

export const metadata = {
  title: "Employee Portal — Management System",
  description: "Employee self-service: payslips, leave, warnings and profile.",
};

export default function PortalPage() {
  return <EmployeePortal />;
}
