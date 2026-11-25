"use client";

// ============================================================
// Employee App — Android-style self-service portal for staff.
// Employees sign in with their employee number / email + PIN to
// view payslips (queryable, downloadable as branded PDF), see
// whether their leave was approved, and check personal info.
// Rendered standalone — no manager chrome around it.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home,
  ReceiptText,
  CalendarDays,
  User,
  LogOut,
  Download,
  Search,
  ChevronDown,
  Loader2,
  Wallet,
  Landmark,
  Plane,
  Plus,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandLogo } from "@/components/brand-logo";
import { StatusBadge, EmptyState } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtDate, fmtDateRange } from "@/lib/format";

// ---------- types ----------
interface PortalEmployee {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  status: string;
}

// Signed-in portal session: bearer token + the employee it belongs to.
interface PortalSession {
  token: string;
  employee: PortalEmployee;
}

interface SlipLine {
  label: string;
  amount: number;
  kind: "earning" | "deduction";
}

interface PortalSlip {
  id: string;
  month: number;
  year: number;
  periodLabel: string;
  baseSalary: number;
  gross: number;
  deductions: number;
  net: number;
  hours: number;
  status: string;
  notes: string | null;
  issuedAt: string | null;
  lines: SlipLine[];
}

interface LeaveRow {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
}

interface WarningRow {
  id: string;
  type: string;
  subject: string;
  details: string;
  issuedBy: string;
  issuedAt: string;
  status: string;
  acknowledgedAt: string | null;
}

interface LoanRow {
  id: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  balance: number;
  status: string;
  issuedAt: string;
}

interface TimesheetRow {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMin: number;
  hours: number;
  status: string;
  notes: string | null;
}

interface MeData {
  employee: PortalEmployee;
  latestPayslip: PortalSlip | null;
  stats: {
    payslipCount: number;
    pendingLeave: number;
    approvedLeave: number;
    ytdGross: number;
    ytdNet: number;
    activeLoan: { balance: number; monthlyPayment: number } | null;
    annualAllowance: number;
    activeWarnings: number;
  };
  currentLeave: LeaveRow | null;
  recentLeave: LeaveRow[];
}

type Tab = "home" | "payslips" | "leave" | "warnings" | "timesheets" | "loans" | "profile";

const SESSION_KEY = "ms-portal-session";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const LEAVE_TYPES = ["annual", "sick", "unpaid", "emergency", "maternity"];

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

// Downloads a payslip PDF via the authenticated endpoint (token in header —
// never in the URL) and saves it with the server-provided filename.
async function downloadPdf(slipId: string, token: string, fallbackName = "payslip.pdf") {
  const r = await fetch(`/api/portal/payslips/${slipId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    toast.error("Could not download the PDF");
    return;
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cd = r.headers.get("content-disposition") ?? "";
  a.download = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================
// Main component
// ============================================================
export function EmployeePortal() {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<MeData | null>(null);
  const [meLoading, setMeLoading] = useState(false);

  // Restore session from localStorage (client only)
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) setSession(JSON.parse(raw) as PortalSession);
      } catch {
        /* ignore corrupted session */
      }
      setChecking(false);
    });
  }, []);

  // Clears the session locally (no server call) — also used for expired tokens.
  const forceSignOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMe(null);
    setTab("home");
  }, []);

  const loadMe = useCallback(
    async (token: string) => {
      setMeLoading(true);
      try {
        const r = await fetch("/api/portal/me", { headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 401) {
          forceSignOut();
          toast.error("Session expired — please sign in again");
          return;
        }
        if (!r.ok) throw new Error();
        setMe(await r.json());
      } catch {
        toast.error("Could not load your details");
      } finally {
        setMeLoading(false);
      }
    },
    [forceSignOut],
  );

  useEffect(() => {
    if (session) Promise.resolve().then(() => loadMe(session.token));
  }, [session, loadMe]);

  const signOut = () => {
    if (session?.token) {
      fetch("/api/portal/logout", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => undefined);
    }
    forceSignOut();
    toast.success("Signed out");
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <PortalLogin onSignedIn={(s) => setSession(s)} />;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:items-center">
      <div className="w-full md:max-w-md lg:max-w-lg min-h-screen md:min-h-0 md:my-6 md:rounded-3xl md:border md:shadow-xl flex flex-col bg-background overflow-hidden relative">
        <PortalHeader employee={session.employee} onSignOut={signOut} />

        <main className="flex-1 p-4 pb-28">
          {meLoading && !me ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your dashboard…
            </div>
          ) : (
            <>
              {tab === "home" && <HomeTab me={me} employee={session.employee} token={session.token} onGoTab={setTab} />}
              {tab === "payslips" && <PayslipsTab token={session.token} />}
              {tab === "leave" && <LeaveTab token={session.token} onChanged={() => session && loadMe(session.token)} />}
              {tab === "warnings" && <WarningsTab token={session.token} onChanged={() => session && loadMe(session.token)} />}
              {tab === "timesheets" && <TimesheetsTab token={session.token} />}
              {tab === "loans" && <LoansTab token={session.token} />}
              {tab === "profile" && <ProfileTab employee={session.employee} me={me} onSignOut={signOut} />}
            </>
          )}
        </main>

        <PortalTabBar tab={tab} setTab={setTab} pendingLeave={me?.stats.pendingLeave ?? 0} activeWarnings={me?.stats.activeWarnings ?? 0} />
      </div>
    </div>
  );
}

// ============================================================
// Login screen
// ============================================================
function PortalLogin({ onSignedIn }: { onSignedIn: (s: PortalSession) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    setError("");
    if (!identifier.trim() || !pin.trim()) {
      setError("Enter your employee number and PIN.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), pin: pin.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Sign in failed");
        return;
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(d));
      toast.success(`Welcome, ${d.employee.name.split(" ")[0]}`);
      onSignedIn({ token: d.token, employee: d.employee as PortalEmployee });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:items-center">
      <div className="w-full md:max-w-md lg:max-w-lg min-h-screen md:min-h-0 md:my-6 md:rounded-3xl md:border md:shadow-xl flex flex-col bg-background overflow-hidden">
        {/* Brand hero */}
        <div className="hero-gradient px-6 pt-10 pb-12 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute top-24 -left-12 h-36 w-36 rounded-full bg-[#00AEEF]/30" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
                <BrandLogo variant="inverse" className="h-9 w-9" />
              </div>
              <div>
                <p className="font-extrabold text-xl tracking-wide leading-none">Management System</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7FCBEC] mt-1">Employee App</p>
              </div>
            </div>
            <h1 className="mt-7 text-2xl font-extrabold leading-snug">Your payslips, leave &amp; info — in one place.</h1>
            <p className="mt-1.5 text-sm text-white/80">Sign in with the details HR gave you.</p>
          </div>
        </div>

        {/* Login card */}
        <div className="flex-1 p-5 -mt-6">
          <Card className="shadow-lg border-border/70">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="portal-id">Employee number</Label>
                <Input
                  id="portal-id"
                  placeholder="e.g. MS-1002 or 1002"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-pin">PIN</Label>
                <Input
                  id="portal-pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="Your 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                />
              </div>
              {error && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-md px-3 py-2">{error}</p>
              )}
              <Button
                onClick={signIn}
                disabled={busy}
                className="w-full h-11 bg-[#00AEEF] text-[#01205E] hover:bg-[#00AEEF]/90 font-bold text-[15px]"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Sign in
              </Button>
            </CardContent>
          </Card>

          {/* Demo credentials helper */}
          <Card className="mt-4 border-dashed bg-muted/40">
            <CardContent className="p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-[#00AEEF]" /> Try the demo
              </p>
              <p>Marcus Reyes — Employee No. <span className="font-mono font-semibold">MS-1002</span> · PIN <span className="font-mono font-semibold">1002</span></p>
              <p className="text-[10px]">Your PIN is set by admin. You can use the full number (MS-1002) or just the digits (1002).</p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 mt-1"
                onClick={() => {
                  setIdentifier("MS-1002");
                  setPin("1002");
                }}
              >
                Fill demo credentials
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="px-5 pb-6 text-center text-[10px] text-muted-foreground">
          Management System · Employee self-service · Install this page as an app from your browser menu
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Header + bottom tab bar
// ============================================================
function PortalHeader({ employee, onSignOut }: { employee: PortalEmployee; onSignOut: () => void }) {
  return (
    <header className="bg-[color:var(--sidebar)] text-white px-4 py-3 flex items-center gap-3 shrink-0">
      <BrandLogo variant="inverse" className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-sm tracking-wide leading-none">Management <span className="text-[#00AEEF]">System</span> · Employee</p>
        <p className="text-[10px] text-white/60 truncate mt-0.5">{employee.name} · {employee.employeeNo}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onSignOut}
        className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}

function PortalTabBar({ tab, setTab, pendingLeave, activeWarnings }: { tab: Tab; setTab: (t: Tab) => void; pendingLeave: number; activeWarnings: number }) {
  const items: Array<{ id: Tab; label: string; icon: typeof Home; badge?: number }> = [
    { id: "home", label: "Home", icon: Home },
    { id: "payslips", label: "Payslips", icon: ReceiptText },
    { id: "leave", label: "Leave", icon: CalendarDays, badge: pendingLeave },
    { id: "warnings", label: "Warnings", icon: ShieldAlert, badge: activeWarnings },
    { id: "timesheets", label: "Hours", icon: Clock },
    { id: "loans", label: "Loans", icon: Wallet },
    { id: "profile", label: "Profile", icon: User },
  ];
  return (
    <nav className="absolute bottom-0 inset-x-0 z-30 bg-[color:var(--sidebar)] safe-bottom shadow-[0_-2px_10px_rgba(1,32,94,0.25)]" aria-label="App tabs">
      <div className="grid grid-cols-7 px-0.5 pt-1.5 pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex flex-col items-center gap-0.5 py-1 px-0.5 relative"
              aria-current={active ? "page" : undefined}
            >
              <span className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full transition-all relative",
                active
                  ? "bg-[color:var(--sidebar-primary)] text-[color:var(--sidebar-primary-foreground)] shadow-md scale-105"
                  : "text-white/70",
              )}>
                <Icon className="h-4 w-4" />
                {item.badge ? (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              <span className={cn(
                "text-[9px] font-bold tracking-wide",
                active ? "text-[color:var(--sidebar-primary)]" : "text-white/55",
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// Home tab
// ============================================================
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function HomeTab({ me, employee, token, onGoTab }: { me: MeData | null; employee: PortalEmployee; token: string; onGoTab: (t: Tab) => void }) {
  if (!me) return <EmptyState icon={Loader2} title="Loading…" description="Fetching your latest details." />;

  const slip = me.latestPayslip;

  return (
    <div className="space-y-4">
      {/* Greeting hero */}
      <div className="hero-gradient rounded-2xl p-4 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10" aria-hidden="true" />
        <p className="text-[11px] text-white/75 font-semibold uppercase tracking-[0.16em]">{greeting()}</p>
        <p className="text-lg font-extrabold mt-0.5">{employee.name}</p>
        <p className="text-xs text-white/80 mt-0.5">{employee.position} · {employee.department}</p>
      </div>

      {/* Latest payslip */}
      {slip ? (
        <Card className="overflow-hidden card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Latest payslip</p>
              <StatusBadge status={slip.status} />
            </div>
            <p className="text-sm font-semibold mt-1">{slip.periodLabel}</p>
            <p className="text-3xl font-extrabold tracking-tight mt-1 text-[#01205E] dark:text-[#7FCBEC]">{fmtMoney(slip.net)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Gross {fmtMoney(slip.gross)} · Deductions −{fmtMoney(slip.deductions)} · Issued {fmtDate(slip.issuedAt)}
            </p>
            <div className="flex gap-2 mt-3">
              <Button onClick={() => downloadPdf(slip.id, token)} className="flex-1 h-9 gap-1.5 bg-[#00AEEF] text-[#01205E] hover:bg-[#00AEEF]/90 font-bold">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" className="h-9" onClick={() => onGoTab("payslips")}>
                View all
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">No payslips yet — they appear here once payroll issues them.</CardContent></Card>
      )}

      {/* Leave status */}
      <Card className="card-hover">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Leave status</p>
            <button className="text-xs font-semibold text-[#018DC5] dark:text-[#00AEEF] flex items-center gap-0.5" onClick={() => onGoTab("leave")}>
              View all <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
          {me.currentLeave ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={me.currentLeave.status} />
                <span className="text-sm font-semibold capitalize">{me.currentLeave.type} leave</span>
                <span className="text-xs text-muted-foreground">{me.currentLeave.days} day{me.currentLeave.days === 1 ? "" : "s"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{fmtDateRange(me.currentLeave.startDate, me.currentLeave.endDate)}</p>
              {me.currentLeave.status === "pending" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Waiting for manager approval — we&apos;ll notify you here once decided.</p>
              )}
              {me.currentLeave.status === "approved" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Approved — enjoy your time off!</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No upcoming leave. Requests you submit appear here with their approval status.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <MiniStat icon={FileText} label="Payslips" value={String(me.stats.payslipCount)} />
        <MiniStat icon={Plane} label="Leave taken" value={`${me.stats.approvedLeave}`} />
        <MiniStat
          icon={Landmark}
          label="Loan balance"
          value={me.stats.activeLoan ? fmtMoney(me.stats.activeLoan.balance) : "None"}
          small={!!me.stats.activeLoan}
        />
      </div>

      {/* Recent leave activity */}
      {me.recentLeave.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent leave activity</p>
            <div className="space-y-2">
              {me.recentLeave.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium capitalize truncate text-[13px]">{l.type} leave</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(l.startDate)}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, small }: { icon: typeof Home; label: string; value: string; small?: boolean }) {
  return (
    <Card className="card-hover">
      <CardContent className="p-3">
        <div className="h-8 w-8 rounded-full bg-[#00AEEF]/15 text-[#018DC5] dark:text-[#00AEEF] flex items-center justify-center mb-1.5">
          <Icon className="h-4 w-4" />
        </div>
        <p className={cn("font-extrabold tracking-tight leading-none", small ? "text-sm" : "text-xl")}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">{label}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Payslips tab — query + download
// ============================================================
function PayslipsTab({ token }: { token: string }) {
  const [slips, setSlips] = useState<PortalSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    slips.forEach((s) => set.add(s.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [slips]);

  const load = useCallback(async (token: string, y: string, m: string, query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/portal/payslips?year=${y}&month=${m}&q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) {
        localStorage.removeItem(SESSION_KEY);
        location.reload();
        return;
      }
      const d = await r.json();
      setSlips(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + refetch when filters change (small debounce for the search box)
  useEffect(() => {
    const t = setTimeout(() => Promise.resolve().then(() => load(token, year, month, q)), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [token, year, month, q, load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">My payslips</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Query by period and download any slip as a PDF.</p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search by period, e.g. October…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search payslips" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9" aria-label="Filter by year"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9" aria-label="Filter by month"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payslips…
        </div>
      ) : slips.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No payslips found"
          description="Try clearing the filters — or ask HR if a slip is missing for a period you worked."
        />
      ) : (
        <div className="space-y-3">
          {slips.map((slip) => {
            const earnings = slip.lines.filter((l) => l.kind === "earning");
            const deductions = slip.lines.filter((l) => l.kind === "deduction");
            const isOpen = expanded === slip.id;
            return (
              <Card key={slip.id} className="overflow-hidden">
                <button
                  className="w-full text-left p-4 focus:outline-none"
                  onClick={() => setExpanded(isOpen ? null : slip.id)}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[15px] leading-tight">{slip.periodLabel}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Issued {fmtDate(slip.issuedAt)} · {slip.hours.toLocaleString()} hrs
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-[#01205E] dark:text-[#7FCBEC] leading-none">{fmtMoney(slip.net)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">net pay</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-xs text-muted-foreground">
                      Gross {fmtMoney(slip.gross)} · Ded −{fmtMoney(slip.deductions)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#018DC5] dark:text-[#00AEEF]">
                      {isOpen ? "Hide breakdown" : "Breakdown"}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t bg-muted/30 p-4 pt-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Earnings</p>
                      {earnings.map((l, i) => (
                        <div key={i} className="flex justify-between text-[13px] py-0.5">
                          <span className="text-muted-foreground pr-2">{l.label}</span>
                          <span className="font-semibold whitespace-nowrap">{fmtMoney(l.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-[13px] py-1 border-t border-border/60 mt-1 font-bold">
                        <span>Gross pay</span>
                        <span>{fmtMoney(slip.gross)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1">Deductions</p>
                      {deductions.map((l, i) => (
                        <div key={i} className="flex justify-between text-[13px] py-0.5">
                          <span className="text-muted-foreground pr-2">{l.label}</span>
                          <span className="font-semibold whitespace-nowrap">−{fmtMoney(l.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-[13px] py-1 border-t border-border/60 mt-1 font-bold">
                        <span>Total deductions</span>
                        <span>−{fmtMoney(slip.deductions)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-[#01205E] text-white rounded-lg px-3 py-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider">Net pay</span>
                      <span className="font-extrabold">{fmtMoney(slip.net)}</span>
                    </div>
                    {slip.notes && <p className="text-[11px] italic text-muted-foreground">Note: {slip.notes}</p>}
                    <Button onClick={() => downloadPdf(slip.id, token)} className="w-full h-9 gap-1.5 bg-[#00AEEF] text-[#01205E] hover:bg-[#00AEEF]/90 font-bold">
                      <Download className="h-4 w-4" /> Download PDF payslip
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Leave tab — approval status + request leave
// ============================================================
function LeaveTab({ token, onChanged }: { token: string; onChanged: () => void }) {
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const r = await fetch("/api/portal/leave", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setLeaves(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(token));
  }, [token, load]);

  const counts = {
    pending: leaves.filter((l) => l.status === "pending").length,
    approved: leaves.filter((l) => l.status === "approved").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
  };

  const submit = async () => {
    if (!start || !end || !reason.trim()) {
      toast.error("Fill in the dates and a short reason");
      return;
    }
    if (new Date(end) < new Date(start)) {
      toast.error("End date must be after the start date");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/portal/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, startDate: start, endDate: end, reason: reason.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Leave request submitted — your manager will review it");
      setOpen(false);
      setReason("");
      setStart("");
      setEnd("");
      await load(token);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">My leave</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Check approval status of every request.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-9 gap-1.5 bg-[#00AEEF] text-[#01205E] hover:bg-[#00AEEF]/90 font-bold shrink-0">
          <Plus className="h-4 w-4" /> Request
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <MiniStat icon={Loader2} label="Pending" value={String(counts.pending)} />
        <MiniStat icon={Plane} label="Approved" value={String(counts.approved)} />
        <MiniStat icon={CalendarDays} label="Rejected" value={String(counts.rejected)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
        </div>
      ) : leaves.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No leave requests yet"
          description="Tap “Request” to apply for leave — you'll see the manager's decision here."
        />
      ) : (
        <div className="space-y-2.5">
          {leaves.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize text-sm">{l.type} leave</span>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{fmtDateRange(l.startDate, l.endDate)} · {l.days} day{l.days === 1 ? "" : "s"}</p>
                {l.reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">“{l.reason}”</p>}
                {l.status === "pending" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">Awaiting manager approval</p>
                )}
                {l.status === "approved" && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5">Approved by your manager</p>
                )}
                {l.status === "rejected" && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5">Not approved — speak to your manager for details</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request leave dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
            <DialogDescription>Your manager reviews requests in the manager dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lv-start">From</Label>
                <Input id="lv-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lv-end">To</Label>
                <Input id="lv-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv-reason">Reason</Label>
              <Textarea id="lv-reason" rows={3} placeholder="Short reason for your request" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Profile tab
// ============================================================
function WarningsTab({ token, onChanged }: { token: string; onChanged: () => void }) {
  const [warnings, setWarnings] = useState<WarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const r = await fetch("/api/portal/warnings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) return;
      const d = await r.json();
      setWarnings(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Failed to load warnings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(token));
  }, [token, load]);

  const acknowledge = async (id: string) => {
    setBusy(id);
    try {
      const r = await fetch("/api/portal/warnings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error ?? "Could not acknowledge");
        return;
      }
      toast.success("Warning acknowledged");
      load(token);
      onChanged();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  const typeStyle = (t: string) => {
    switch (t) {
      case "verbal": return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
      case "written": return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
      case "final": return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
      case "performance": return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
      case "safety": return "bg-orange-500/15 text-orange-700 dark:text-orange-300";
      default: return "bg-slate-500/15 text-slate-700 dark:text-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck className="h-12 w-12 text-emerald-500 mb-3" />
        <p className="font-semibold text-lg">No warnings on file</p>
        <p className="text-sm text-muted-foreground mt-1">You have a clean record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground px-1">
        Warnings issued to you by management. Acknowledge each one to confirm you've read it.
      </p>
      {warnings.map((w) => (
        <Card key={w.id} className={w.status === "active" ? "border-amber-400/60" : ""}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide capitalize ${typeStyle(w.type)}`}>
                  {w.type}
                </span>
                <h3 className="font-semibold text-sm leading-tight">{w.subject}</h3>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                w.status === "active" ? "bg-amber-500 text-white" :
                w.status === "acknowledged" ? "bg-emerald-500 text-white" :
                "bg-slate-400 text-white"
              }`}>
                {w.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{w.details}</p>
            <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
              <span>Issued by {w.issuedBy} · {new Date(w.issuedAt).toLocaleDateString()}</span>
              {w.acknowledgedAt && <span>Acknowledged {new Date(w.acknowledgedAt).toLocaleDateString()}</span>}
            </div>
            {w.status === "active" && (
              <Button
                size="sm"
                className="w-full mt-2"
                disabled={busy === w.id}
                onClick={() => acknowledge(w.id)}
              >
                {busy === w.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                I've read this — acknowledge
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LoansTab({ token }: { token: string }) {
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/portal/loans", { headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 401) return;
        const d = await r.json();
        setLoans(Array.isArray(d) ? d : []);
      } catch {
        toast.error("Failed to load loans");
      } finally {
        setLoading(false);
      }
    });
  }, [token]);

  const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Wallet className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="font-semibold text-lg">No loans on record</p>
        <p className="text-sm text-muted-foreground mt-1">You have no active or past loans.</p>
      </div>
    );
  }

  const active = loans.filter((l) => l.status === "active");
  const totalBalance = active.reduce((s, l) => s + l.balance, 0);
  const totalMonthly = active.reduce((s, l) => s + l.monthlyPayment, 0);

  return (
    <div className="space-y-3">
      {active.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding balance</p>
            <p className="text-2xl font-bold text-primary">{fmtMoney(totalBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">Monthly deductions: {fmtMoney(totalMonthly)}</p>
          </CardContent>
        </Card>
      )}
      {loans.map((l) => {
        const paid = l.principal + (l.principal * l.interestRate * l.termMonths) / 1200 - l.balance;
        const total = l.monthlyPayment * l.termMonths;
        const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
        return (
          <Card key={l.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{fmtMoney(l.principal)} loan</p>
                  <p className="text-xs text-muted-foreground">
                    {l.termMonths} months · {l.interestRate}% interest · issued {new Date(l.issuedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  l.status === "active" ? "bg-amber-500 text-white" :
                  l.status === "paid" ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"
                }`}>{l.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Monthly</p><p className="font-medium">{fmtMoney(l.monthlyPayment)}</p></div>
                <div><p className="text-xs text-muted-foreground">Balance</p><p className="font-medium">{fmtMoney(l.balance)}</p></div>
                <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-medium">{pct}%</p></div>
              </div>
              {l.status === "active" && (
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TimesheetsTab({ token }: { token: string }) {
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/portal/timesheets", { headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 401) return;
        const d = await r.json();
        setTimesheets(Array.isArray(d) ? d : []);
      } catch {
        toast.error("Failed to load timesheets");
      } finally {
        setLoading(false);
      }
    });
  }, [token]);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  if (timesheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="font-semibold text-lg">No timesheets yet</p>
        <p className="text-sm text-muted-foreground mt-1">Your logged hours will appear here.</p>
      </div>
    );
  }

  const totalHours = timesheets.reduce((s, t) => s + t.hours, 0);
  const fmtTime = (s: string | null) => s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-3">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total hours (recent)</p>
            <p className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}h</p>
          </div>
          <Clock className="h-8 w-8 text-primary/40" />
        </CardContent>
      </Card>
      {timesheets.map((t) => {
        const d = new Date(t.date);
        return (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col items-center justify-center w-12 shrink-0">
                  <span className="text-[10px] uppercase text-muted-foreground">{d.toLocaleDateString([], { month: "short" })}</span>
                  <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium whitespace-nowrap">
                    {fmtTime(t.clockIn)} → {fmtTime(t.clockOut)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.hours.toFixed(1)}h worked · {t.breakMin}min break
                    {t.notes && ` · ${t.notes}`}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                t.status === "approved" ? "bg-emerald-500 text-white" :
                t.status === "rejected" ? "bg-rose-500 text-white" : "bg-slate-400 text-white"
              }`}>{t.status}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ProfileTab({ employee, me, onSignOut }: { employee: PortalEmployee; me: MeData | null; onSignOut: () => void }) {
  return (
    <div className="space-y-4">
      {/* Identity card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-[#01205E] text-white flex items-center justify-center text-lg font-extrabold shrink-0">
              {initials(employee.name)}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-[15px] leading-tight">{employee.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{employee.position}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <StatusBadge status={employee.status} />
                <span className="text-[10px] font-mono text-muted-foreground">{employee.employeeNo}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Personal info</p>
          <InfoRow label="Email" value={employee.email} />
          <InfoRow label="Phone" value={employee.phone ?? "—"} />
          <InfoRow label="Department" value={employee.department} />
          <InfoRow label="Date joined" value={fmtDate(employee.hireDate)} />
          <InfoRow label="Base salary" value={`${fmtMoney(employee.salary)} / month`} />
          {me && <InfoRow label="Annual leave allowance" value={`${me.stats.annualAllowance} days`} />}
        </CardContent>
      </Card>

      {/* Active loan */}
      {me?.stats.activeLoan && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Staff loan
            </p>
            <InfoRow label="Outstanding balance" value={fmtMoney(me.stats.activeLoan.balance)} />
            <InfoRow label="Monthly installment" value={fmtMoney(me.stats.activeLoan.monthlyPayment)} />
            <p className="text-[11px] text-muted-foreground mt-2">The installment is automatically deducted on your payslip.</p>
          </CardContent>
        </Card>
      )}

      {/* Year to date */}
      {me && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">This year so far</p>
            <InfoRow label="Gross earnings (YTD)" value={fmtMoney(me.stats.ytdGross)} />
            <InfoRow label="Net received (YTD)" value={fmtMoney(me.stats.ytdNet)} />
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300 gap-2" onClick={onSignOut}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>

      <p className="text-center text-[10px] text-muted-foreground pb-1">
        Management System · Employee App v1.0 · Data shown is from the manager dashboard
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-right truncate">{value}</span>
    </div>
  );
}
