"use client";

import { useEffect, useState } from "react";
import { KpiCard, SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Clock, CalendarDays, MessageSquareWarning, Banknote, Truck, Fuel, Route, TrendingUp, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface DashboardData {
  kpis: {
    employees: number;
    activeEmployees: number;
    onLeave: number;
    pendingLeave: number;
    openComplaints: number;
    criticalComplaints: number;
    activeLoans: number;
    totalLoanBalance: number;
    vehicles: number;
    activeVehicles: number;
    vehiclesInMaintenance: number;
    hoursToday: number;
    fleetTripsWeek: number;
    fleetDistanceWeek: number;
    fuelCostWeek: number;
    newComplaintsWeek: number;
  };
  charts: {
    hoursByDay: { label: string; hours: number }[];
    departmentDist: { name: string; value: number }[];
    leaveByType: { name: string; value: number }[];
    complaintByCategory: { name: string; value: number }[];
    weeklyTrend: { label: string; hours: number; trips: number; complaintsOpen: number; complaintsResolved: number }[];
  };
  recentReports: { id: string; title: string; weekStart: string; summary: string }[];
  recentComplaints: { id: string; title: string; priority: string; status: string; employee?: { name: string } }[];
  pendingLeaveList: { id: string; type: string; days: number; employee?: { name: string } }[];
}

// Brand chart palette: navy, cyan, mid-blue, sky, slate + status tones
const PIE_COLORS = ["#01205E", "#00AEEF", "#018DC5", "#3B5899", "#7FCBEC", "#F0625D", "#94A8D8"];

export function DashboardView() {
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => setLoading(true));
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5 h-28" />
          </Card>
        ))}
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div className="space-y-6">
      {/* Hero banner — gradient cyan→navy, brand */}
      <div className="hero-gradient rounded-2xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -right-2 top-16 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute right-10 -bottom-8 h-28 w-28 rounded-full bg-[#00AEEF]/25" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
              Hello, Sarah
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Here's what's happening across your operations today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSection("factory-reports")}
              className="bg-[#00AEEF] text-[#01205E] rounded-full px-4 py-2 text-sm font-bold hover:brightness-105 transition-all shadow-md"
            >
              New factory report
            </button>
            <button
              onClick={() => setActiveSection("fleet")}
              className="bg-white/15 backdrop-blur text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-white/25 transition-all border border-white/30"
            >
              Fleet status
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard label="Total Employees" value={k.employees} hint={`${k.activeEmployees} active · ${k.onLeave} on leave`} icon={Users} accent="cyan" />
        <KpiCard label="Hours Today" value={k.hoursToday} hint="Logged across active staff" icon={Clock} accent="emerald" />
        <KpiCard label="Pending Leave" value={k.pendingLeave} hint="Awaiting approval" icon={CalendarDays} accent="violet" />
        <KpiCard label="Open Complaints" value={k.openComplaints} hint={`${k.criticalComplaints} critical`} icon={MessageSquareWarning} accent={k.criticalComplaints > 0 ? "rose" : "amber"} />
        <KpiCard label="Active Loans" value={k.activeLoans} hint={`$${k.totalLoanBalance.toLocaleString()} outstanding`} icon={Banknote} accent="amber" />
        <KpiCard label="Fleet Vehicles" value={k.vehicles} hint={`${k.activeVehicles} active · ${k.vehiclesInMaintenance} in maintenance`} icon={Truck} accent="cyan" />
        <KpiCard label="Fleet Trips (7d)" value={k.fleetTripsWeek} hint={`${k.fleetDistanceWeek.toLocaleString()} km`} icon={Route} accent="emerald" />
        <KpiCard label="Fuel Cost (7d)" value={`$${k.fuelCostWeek.toFixed(0)}`} hint="Avg $0.12 / km" icon={Fuel} accent="rose" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hours Logged — Last 7 Days</CardTitle>
            <CardDescription>Daily productive hours across the team</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.charts.hoursByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="hours" fill="#00AEEF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Trend</CardTitle>
            <CardDescription>Hours, fleet trips and complaint flow</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.charts.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="hours" stroke="#00AEEF" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="trips" stroke="#01205E" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="complaintsResolved" stroke="#018DC5" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Distribution</CardTitle>
            <CardDescription>Headcount across teams</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.charts.departmentDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {data.charts.departmentDist.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complaints by Category</CardTitle>
            <CardDescription>All-time distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {data.charts.complaintByCategory.length === 0 ? (
              <EmptyState title="No complaints yet" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.charts.complaintByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={90} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="value" fill="#F0625D" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Open Complaints
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-72 overflow-y-auto">
            {data.recentComplaints.length === 0 ? (
              <EmptyState title="All clear" description="No open complaints" />
            ) : (
              data.recentComplaints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveSection("complaints")}
                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-1">{c.title}</p>
                    <StatusBadge status={c.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.employee?.name ?? "Unknown"}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              Pending Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-72 overflow-y-auto">
            {data.pendingLeaveList.length === 0 ? (
              <EmptyState title="Nothing pending" description="No leave requests awaiting approval" />
            ) : (
              data.pendingLeaveList.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveSection("leave")}
                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{l.employee?.name ?? "Unknown"}</p>
                    <span className="text-xs text-muted-foreground">{l.days}d</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{l.type} leave</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-72 overflow-y-auto">
            {data.recentReports.length === 0 ? (
              <EmptyState title="No reports yet" description="Generate one from the Reports tab" />
            ) : (
              data.recentReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveSection("reports")}
                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium line-clamp-1">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.summary}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
