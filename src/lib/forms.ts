// ============================================================
// Management System — official company form templates.
// Field definitions are the single source of truth for:
//   • the fill-in UI (src/components/views/forms.tsx)
//   • stored submissions (FormSubmission.data JSON)
//   • the PDF generator (src/lib/pdf-generator.ts)
// Layouts replicate the original paper documents doc-for-doc.
// ============================================================

export type FormFieldType =
  | "text"
  | "textarea"
  | "date"
  | "time"
  | "number"
  | "select"
  | "yesno"
  | "checkbox-group";

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  /** for select */
  options?: string[];
  /** for checkbox-group */
  checkboxOptions?: string[];
  /** render half-width in the fill-in dialog */
  half?: boolean;
  placeholder?: string;
  /** auto-generated document ID prefix (e.g. "IR") */
  autoId?: boolean;
}

export interface FormSection {
  /** navy banner heading on the PDF; plain group heading in the UI */
  heading?: string;
  /** explanatory note printed under the heading */
  note?: string;
  fields: FormField[];
}

export interface FormSignBlock {
  leftLabel: string;
  rightLabel?: string;
  /** optional field keys printed under the signature lines */
  leftNameKey?: string;
  rightNameKey?: string;
  withDate?: boolean;
}

export interface FormTemplate {
  id: string;
  docId: string;
  docIdLabel?: string; // "DOC. NAME" | "DOC. NO"
  title: string;
  company: string;
  meta: { label: string; value: string }[];
  /** purpose blurb printed on the form (Customer Notification Form) */
  blurb?: string;
  /** top-level ID field key used for auto IDs + filenames */
  idFieldKey?: string;
  idPrefix?: string;
  /** field key whose value becomes the list subtitle */
  summaryKey: string;
  sections: FormSection[];
  signBlocks: FormSignBlock[];
  /** supervisor footer (Customer Notification Form) */
  supervisor?: { role: string; name: string };
  /** small extra fields rendered at the bottom (MLAF: OUTLOOK / VIP) */
  footerFields?: { key: string; label: string }[];
}

export type FormDataValue = string | string[];
export type FormData = Record<string, FormDataValue>;

const NAVY = "#01205E";

// ------------------------------------------------------------
// 1. MS-CW-IR-01 — Incident Report Form (MANAGEMENT SYSTEM · CAR WASH)
// ------------------------------------------------------------
const incidentReport: FormTemplate = {
  id: "incident-report",
  docId: "MS-CW-IR-01",
  title: "Incident Report Form",
  company: "MANAGEMENT SYSTEM · CAR WASH",
  meta: [
    { label: "REV/DATE", value: "19/07/2024" },
    { label: "DOC. NAME", value: "MS-CW-IR-01" },
    { label: "REVIEW DATE", value: "19/07/2024" },
    { label: "REVIEW NR", value: "00" },
    { label: "CREATED BY", value: "DIRK BOSMAN" },
    { label: "APPROVED BY", value: "DIRK BOSMAN" },
  ],
  idFieldKey: "incidentId",
  idPrefix: "IR",
  summaryKey: "customerName",
  sections: [
    {
      fields: [
        { key: "incidentId", label: "Incident ID", type: "text", required: true, autoId: true, half: true },
        { key: "dateOfIncident", label: "Date of Incident", type: "date", required: true, half: true },
        { key: "timeOfIncident", label: "Time of Incident", type: "time", half: true },
        { key: "customerName", label: "Customer Name", type: "text", required: true, half: true },
        { key: "customerInformation", label: "Customer Information", type: "textarea", placeholder: "Contact number, email, address…" },
        { key: "dateCustomerReported", label: "Date Customer reported the Incident", type: "date", half: true },
        { key: "vehicleDetails", label: "Vehicle Details", type: "text", placeholder: "Make, model, color, plate…" },
        { key: "natureOfDamage", label: "Nature of Damage", type: "textarea", required: true, placeholder: "Describe the damage in detail…" },
        { key: "employeeInvolved", label: "Any employee involved", type: "yesno", half: true },
        { key: "employeeNames", label: "Name of Employee/s", type: "text", half: true },
        { key: "actionTakenByCustomer", label: "Action taken by customer", type: "textarea" },
        { key: "desiredResolution", label: "Customer's desired resolution", type: "textarea" },
        { key: "actionTakenByCompany", label: "Action taken by company", type: "textarea" },
        { key: "employeeHandling", label: "Employee Handling Incident", type: "text", half: true },
        { key: "followUpActions", label: "Follow-up Actions", type: "textarea" },
      ],
    },
  ],
  signBlocks: [
    { leftLabel: "Signature of Manager", rightLabel: "Signature of Car Wash", withDate: true },
  ],
};

// ------------------------------------------------------------
// 2. MS-ARF-2024 — Accident Report Form (MANAGEMENT SYSTEM)
// ------------------------------------------------------------
const accidentReport: FormTemplate = {
  id: "accident-report",
  docId: "MS-ARF-2024",
  title: "Accident Report Form",
  company: "MANAGEMENT SYSTEM",
  meta: [
    { label: "REV/DATE", value: "16/09/2024" },
    { label: "DOC. NAME", value: "MS-ARF-2024" },
    { label: "REVIEW DATE", value: "03/09/2025" },
    { label: "REVIEW NR", value: "01" },
    { label: "CREATED BY", value: "Admin" },
    { label: "APPROVED BY", value: "Dirk Bosman" },
  ],
  idFieldKey: "reportId",
  idPrefix: "ARF",
  summaryKey: "driverName",
  sections: [
    {
      fields: [
        { key: "reportId", label: "Report ID", type: "text", required: true, autoId: true, half: true },
        { key: "dateReportFilled", label: "Date report was filled in", type: "date", required: true, half: true },
        { key: "driverName", label: "Driver Name", type: "text", required: true, half: true },
        { key: "nationalId", label: "National ID", type: "text", half: true },
        { key: "licenseNumber", label: "Driver's License Number", type: "text", half: true },
        { key: "licenseType", label: "License Type", type: "text", half: true },
        { key: "licenseIssueDate", label: "License Issue Date", type: "date", half: true },
        { key: "dateOfBirth", label: "Date of Birth", type: "date", half: true },
        { key: "occupation", label: "Occupation", type: "text", half: true },
        { key: "address", label: "Address", type: "textarea" },
        { key: "driverEmployedByYou", label: "Is driver employed by you?", type: "yesno", half: true },
        { key: "prosecutedLast3Years", label: "Has the driver been prosecuted for any driving offence in the last 3 years?", type: "yesno", half: true },
        { key: "previousAccidents", label: "Has the driver been involved in any accidents previously?", type: "yesno", half: true },
        { key: "personsInVehicle", label: "Number of Persons in Your Vehicle", type: "number", half: true },
        { key: "odometerReading", label: "Odometer Reading", type: "text", half: true },
        { key: "visibility", label: "Visibility", type: "text", half: true },
      ],
    },
    {
      heading: "DETAILS OF ACCIDENT",
      fields: [
        { key: "accidentDate", label: "Date of the Accident", type: "date", required: true, half: true },
        { key: "accidentTime", label: "Time of the Accident", type: "time", half: true },
        { key: "location", label: "Location", type: "text" },
        { key: "weatherConditions", label: "Weather Conditions", type: "text", half: true },
        { key: "neighborhood", label: "Neighborhood", type: "text", half: true },
        { key: "policeStation", label: "Police Station", type: "text", half: true },
        { key: "policeCaseNumber", label: "Police Case Number", type: "text", half: true },
        { key: "howAccidentOccurred", label: "How did the accident occur?", type: "textarea", required: true },
        { key: "atFaultAndWhy", label: "Please enter who in your opinion is at fault and why?", type: "textarea" },
        { key: "vehicleUsedFor", label: "What was the vehicle being used for at the time of the accident?", type: "textarea" },
        { key: "injuriesDetails", label: "Details of injuries in Company Vehicle", type: "textarea" },
        { key: "vehicleTowed", label: "Was the vehicle towed?", type: "yesno", half: true },
        { key: "damageDescription", label: "Description of Damage on Company Vehicle", type: "textarea" },
        { key: "repairerName", label: "Name of Repairer", type: "text", half: true },
        { key: "inspectionLocation", label: "Where can the vehicle be inspected?", type: "text", half: true },
        { key: "otherVehiclesInvolved", label: "Were there any other vehicles involved?", type: "yesno", half: true },
        { key: "insuranceCompany", label: "Insurance Company (other vehicle)", type: "text", half: true },
        { key: "policyNumber", label: "Policy Number", type: "text", half: true },
        { key: "policyExpiryDate", label: "Expiry Date", type: "date", half: true },
        { key: "propertyDamaged", label: "Was any building, wall, fence, utility pole or other property damaged?", type: "yesno", half: true },
        { key: "witnessNames", label: "Name of Witnesses", type: "textarea" },
        { key: "witnessContacts", label: "Contact details of Witnesses", type: "textarea" },
      ],
    },
  ],
  signBlocks: [
    { leftLabel: "Signature of Driver", rightLabel: "Signature of Manager", withDate: true },
  ],
};

// ------------------------------------------------------------
// 3. MS-CCF-01 — Customer Complaint Form (MANAGEMENT SYSTEM)
// ------------------------------------------------------------
const customerComplaint: FormTemplate = {
  id: "customer-complaint",
  docId: "MS-CCF-01",
  title: "Customer Complaint Form",
  company: "MANAGEMENT SYSTEM",
  meta: [
    { label: "REV/DATE", value: "03/09/2024" },
    { label: "DOC. NAME", value: "MS-CCF-01" },
    { label: "REVIEW DATE", value: "03/09/2024" },
    { label: "REVIEW NR", value: "01" },
    { label: "CREATED BY", value: "Admin" },
    { label: "APPROVED BY", value: "Dirk Bosman" },
  ],
  idFieldKey: "complaintId",
  idPrefix: "CC",
  summaryKey: "clientName",
  sections: [
    {
      fields: [
        { key: "date", label: "Date", type: "date", required: true, half: true },
        { key: "complaintId", label: "Complaint ID", type: "text", required: true, autoId: true, half: true },
        {
          key: "receivedVia",
          label: "Complaint Received via",
          type: "select",
          required: true,
          options: ["Walk-in", "Phone call", "Email", "WhatsApp", "Social media", "Website", "Other"],
          half: true,
        },
        { key: "clientName", label: "Client's Name and Surname", type: "text", required: true, half: true },
        { key: "clientEmail", label: "Client's Email", type: "text", half: true },
        { key: "supervisorName", label: "Supervisor Name", type: "text", half: true },
        { key: "employeeName", label: "Employee Name", type: "text", half: true },
      ],
    },
    {
      heading: "COMPLAINT DETAILS",
      fields: [
        { key: "incidentDetails", label: "Details of the incident or complaint?", type: "textarea", required: true },
        { key: "clientWants", label: "What does the client want us to do?", type: "textarea" },
        { key: "companyAction", label: "What did the company do?", type: "textarea" },
        { key: "dealtWithBy", label: "Who dealt with the complaint?", type: "text", half: true },
        { key: "complaintHandled", label: "Complaint Handled", type: "yesno", half: true },
      ],
    },
  ],
  signBlocks: [
    {
      leftLabel: "Signed by Management",
      rightLabel: "Signed by Employee",
      leftNameKey: "managementSignatory",
      rightNameKey: "employeeSignatory",
    },
  ],
};

// ------------------------------------------------------------
// 4. MS-CNF-2024 — Customer Notification Form (MANAGEMENT SYSTEM · CLEANING)
// ------------------------------------------------------------
const customerNotification: FormTemplate = {
  id: "customer-notification",
  docId: "MS-CNF-2024",
  docIdLabel: "DOC. NO",
  title: "Customer Notification Form",
  company: "MANAGEMENT SYSTEM · CLEANING",
  meta: [
    { label: "REV/DATE", value: "09.07.2023" },
    { label: "DOC. NO", value: "MS-CNF-2024" },
    { label: "NEXT REVIEW DATE", value: "10.07.2024" },
    { label: "REVIEW NR", value: "02" },
    { label: "CREATED BY", value: "Dirk Bosman" },
    { label: "APPROVED BY", value: "Dirk Bosman" },
  ],
  blurb:
    "Purpose of a Customer Notification Form: The purpose of a customer notification form is to inform customers about important updates, changes, or events related to a product, service, or business. It serves as a formal communication tool that allows organizations to proactively share information with their customers.",
  idFieldKey: "docIdField",
  idPrefix: "CNF",
  summaryKey: "customerName",
  sections: [
    {
      heading: "CUSTOMER INFORMATION",
      fields: [
        { key: "date", label: "Date", type: "date", required: true, half: true },
        { key: "siteName", label: "Site Name", type: "text", half: true },
        { key: "customerName", label: "Customer Name", type: "text", required: true, half: true },
        { key: "docIdField", label: "Doc ID", type: "text", required: true, autoId: true, half: true },
        { key: "customerContact", label: "Customer Contact Details", type: "text", half: true },
        { key: "customerEmail", label: "Customer Email Address", type: "text", half: true },
      ],
    },
    {
      heading: "NOTIFICATION DESCRIPTION",
      fields: [
        { key: "dateOfContact", label: "Date of Contact", type: "date", half: true },
        { key: "customerInformed", label: "Customer Informed", type: "yesno", half: true },
        {
          key: "notificationCategory",
          label: "Notification Category",
          type: "select",
          options: ["Service update", "Quality issue", "Schedule change", "Price change", "Incident", "General notice", "Other"],
          half: true,
        },
        { key: "lodgedBy", label: "Notification Lodged By", type: "text", half: true },
        { key: "notificationDetailsLocation", label: "Notification Details/Location", type: "text", half: true },
        { key: "notificationDescription", label: "Notification Description", type: "textarea", required: true },
      ],
    },
    {
      heading: "NOTIFICATION DETAILS",
      fields: [
        { key: "firstReportedBy", label: "First Reported by", type: "text", half: true },
        { key: "reportedTimeAndDate", label: "Time and Date", type: "text", half: true, placeholder: "e.g. 14:30 — 17/11/2026" },
        { key: "source", label: "Source", type: "text", half: true },
        { key: "firstTimeReport", label: "Is this the first time to report this?", type: "yesno", half: true },
        { key: "firstNotificationAction", label: "If No, what was done during the first Notification?", type: "textarea" },
        { key: "otherComment", label: "Any other comment", type: "textarea" },
      ],
    },
  ],
  signBlocks: [],
  supervisor: { role: "Quality Supervisor", name: "Frans Dausab" },
};

// ------------------------------------------------------------
// 5. MS-MLAF-01 — Multi Leave Application Form (MANAGEMENT SYSTEM · CLEANING)
// ------------------------------------------------------------
export interface LeaveRowDef {
  no: number;
  name: string;
  note?: string;
  checkboxOptions?: string[];
  /** data key prefix for this row: `${prefix}From`, `${prefix}To`, `${prefix}Days`, `${prefix}Credit`, `${prefix}Opts` */
  prefix: string;
}

export const LEAVE_ROWS: LeaveRowDef[] = [
  { no: 1, name: "ANNUAL LEAVE", checkboxOptions: ["FULL", "CONDONED"], prefix: "l1" },
  { no: 2, name: "SICK LEAVE", note: "(Medical certificate required for 2 or more days)", checkboxOptions: ["CERTIFIED", "UNCERTIFIED", "INJURY ON DUTY"], prefix: "l2" },
  { no: 3, name: "MATERNITY LEAVE", note: "(Attach supporting documents i.e. birth certificate)", prefix: "l3" },
  { no: 4, name: "COMPASSIONATE LEAVE", checkboxOptions: ["CHILD", "SIBLING", "SPOUSE", "PARENT"], prefix: "l4" },
  { no: 5, name: "SPECIAL LEAVE", note: "(Attach supporting documents)", checkboxOptions: ["STATE WITNESS", "SPORT", "UNION"], prefix: "l5" },
  { no: 6, name: "STUDY LEAVE", note: "(Attach proof of subjects and examination date)", prefix: "l6" },
];

const leaveApplication: FormTemplate = {
  id: "leave-application",
  docId: "MS-MLAF-01",
  title: "Multi Leave Application Form",
  company: "MANAGEMENT SYSTEM · CLEANING",
  meta: [
    { label: "REV/DATE", value: "06/04/2021" },
    { label: "DOC. NAME", value: "MS-MLAF-01" },
    { label: "REVIEW DATE", value: "05/04/2022" },
    { label: "REVIEW NR", value: "00" },
    { label: "CREATED BY", value: "TJ Engelbrecht" },
    { label: "APPROVED BY", value: "RL BOSMAN" },
  ],
  summaryKey: "employeeName",
  sections: [
    {
      fields: [
        { key: "employeeName", label: "Name", type: "text", required: true, half: true },
        { key: "companyNo", label: "Co. No.", type: "text", half: true },
        { key: "section", label: "Section", type: "text", half: true },
      ],
    },
    {
      heading: "TYPE OF LEAVE APPLIED FOR",
      note: "Tick the leave type, fill in the dates, number of days and days credited. Only the applied-for row is needed.",
      fields: LEAVE_ROWS.flatMap((row): FormField[] => {
        const fields: FormField[] = [];
        if (row.checkboxOptions?.length) {
          fields.push({ key: `${row.prefix}Opts`, label: `${row.no}. ${row.name}`, type: "checkbox-group", checkboxOptions: row.checkboxOptions });
        } else {
          fields.push({ key: `${row.prefix}Applied`, label: `${row.no}. ${row.name}`, type: "yesno" });
        }
        fields.push({ key: `${row.prefix}From`, label: "From", type: "date", half: true });
        fields.push({ key: `${row.prefix}To`, label: "To", type: "date", half: true });
        fields.push({ key: `${row.prefix}Days`, label: "No. of Days", type: "number", half: true });
        fields.push({ key: `${row.prefix}Credit`, label: "No. of Days Credit", type: "number", half: true });
        return fields;
      }),
    },
    {
      heading: "FULL ADDRESS WHILE ON LEAVE",
      fields: [{ key: "addressWhileOnLeave", label: "Full Address While on Leave", type: "textarea" }],
    },
    {
      heading: "ABSENCE WITHOUT ACCRUAL OF BENEFITS",
      fields: [
        { key: "unpaidReason", label: "7. UNPAID (Give Reason)", type: "text" },
        { key: "unpaidFrom", label: "Unpaid — From", type: "date", half: true },
        { key: "unpaidTo", label: "Unpaid — To", type: "date", half: true },
        { key: "unpaidDays", label: "Unpaid — No. of Days", type: "number", half: true },
        { key: "awolFrom", label: "8. AWOL — From", type: "date", half: true },
        { key: "awolTo", label: "8. AWOL — To", type: "date", half: true },
        { key: "awolDays", label: "8. AWOL — No. of Days", type: "number", half: true },
      ],
    },
    {
      heading: "PAYMENTS REQUIRED (Tick Appropriate Box)",
      note: "* After commutation the employee must have 15 days leave left (if less than 20 days leave were taken during the preceding leave cycle). Payment will only be included with the next salary.",
      fields: [
        { key: "holidayBonus", label: "a. Holiday Bonus", type: "yesno", half: true },
        { key: "leavePay", label: "b. Leave Pay", type: "yesno", half: true },
        { key: "commutation", label: "c. Commutation", type: "yesno", half: true },
        { key: "commutationDays", label: "Commutation — No. of Days", type: "number", half: true },
      ],
    },
  ],
  signBlocks: [
    { leftLabel: "Employee's Signature", rightLabel: "Date", withDate: false },
    { leftLabel: "Supervisor's Signature", rightLabel: "Date", withDate: false },
    { leftLabel: "Approval by Manager", rightLabel: "Date", withDate: false },
  ],
  footerFields: [
    { key: "outlook", label: "OUTLOOK" },
    { key: "vip", label: "VIP" },
  ],
};

// ------------------------------------------------------------
// Registry
// ------------------------------------------------------------
export const FORM_TEMPLATES: FormTemplate[] = [
  incidentReport,
  accidentReport,
  customerComplaint,
  customerNotification,
  leaveApplication,
];

export function getTemplate(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.id === id);
}

/** All leaf field keys of a template (including checkbox-group keys). */
export function templateFieldKeys(t: FormTemplate): string[] {
  const keys: string[] = [];
  for (const s of t.sections) for (const f of s.fields) keys.push(f.key);
  return keys;
}

/** Human list title for a submission. */
export function submissionTitle(templateId: string, data: FormData): string {
  const t = getTemplate(templateId);
  if (!t) return "Form";
  const summary = typeof data[t.summaryKey] === "string" ? (data[t.summaryKey] as string) : "";
  const idField = t.idFieldKey && typeof data[t.idFieldKey] === "string" ? (data[t.idFieldKey] as string) : "";
  const parts = [idField, summary].filter(Boolean);
  return parts.length ? parts.join(" — ") : t.title;
}

/** Suggest the next document ID like IR-2026-0007 based on an existing list. */
export function suggestDocId(prefix: string, existingIds: string[]): string {
  const year = new Date().getFullYear();
  let max = 0;
  for (const id of existingIds) {
    const m = id?.match(new RegExp(`^${prefix}-${year}-(\\d+)$`, "i"));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix.toUpperCase()}-${year}-${String(max + 1).padStart(4, "0")}`;
}

/** Format a stored value for display / PDF printing. */
export function formatValue(field: FormField, value: FormDataValue | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  if (field.type === "checkbox-group") {
    return Array.isArray(value) ? value.join(" / ") : String(value);
  }
  if (field.type === "yesno") {
    const v = String(value);
    return v === "yes" ? "YES" : v === "no" ? "NO" : v;
  }
  if (field.type === "date") {
    const v = String(value);
    // stored as yyyy-mm-dd → display dd/mm/yyyy (matches the paper forms)
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return v;
  }
  return String(value);
}

export const BRAND = { navy: NAVY, cyan: "#00AEEF" };
