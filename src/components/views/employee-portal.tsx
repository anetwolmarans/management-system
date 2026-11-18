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
  };
  currentLeave: LeaveRow | null;
  recentLeave: LeaveRow[];
}

type Tab = "home" | "payslips" | "leave" | "profile";

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
              {tab === "profile" && <ProfileTab employee={session.employee} me={me} onSignOut={signOut} />}
            </>
          )}
        </main>

        <PortalTabBar tab={tab} setTab={setTab} pendingLeave={me?.stats.pendingLeave ?? 0} />
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
      setError("Enter your employee number / email and PIN.");
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
                <Label htmlFor="portal-id">Employee number or email</Label>
                <Input
                  id="portal-id"
                  placeholder="e.g. MS-1002 or name@managementsystem.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  autoCapitalize="characters"
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
              <p>Marcus Reyes — <span className="font-mono font-semibold">MS-1002</span> · PIN <span className="font-mono font-semibold">1002</span></p>
              <p className="text-[10px]">Every employee&apos;s default PIN is the last 4 digits of their employee number. HR can reset it.</p>
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

function PortalTabBar({ tab, setTab, pendingLeave }: { tab: Tab; setTab: (t: Tab) => void; pendingLeave: number }) {
  const items: Array<{ id: Tab; label: string; icon: typeof Home; badge?: number }> = [
    { id: "home", label: "Home", icon: Home },
    { id: "payslips", label: "Payslips", icon: ReceiptText },
    { id: "leave", label: "Leave", icon: CalendarDays, badge: pendingLeave },
    { id: "profile", label: "Profile", icon: User },
  ];
  return (
    <nav className="absolute bottom-0 inset-x-0 z-30 bg-[color:var(--sidebar)] safe-bottom shadow-[0_-2px_10px_rgba(1,32,94,0.25)]" aria-label="App tabs">
      <div className="grid grid-cols-4 px-1 pt-1.5 pb-1">
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
