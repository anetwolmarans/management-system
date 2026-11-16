"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState, KpiCard, StatRow } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Plus, Fuel, Route, Wrench, Gauge, MapPin, Calendar, FileCheck, ClipboardList,
  History, Bell, CheckCircle2, AlertTriangle, XCircle, DollarSign, Settings, Package,
  RefreshCw, Eye, Pencil,
} from "lucide-react";
import { toast } from "sonner";

// ---------- Types ----------
interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  status: string;
  assignedTo: string | null;
  mileage: number;
  fuelLevel: number;
  vin?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  supplier?: string | null;
  color?: string | null;
  insuranceExpiry?: string | null;
  registrationExpiry?: string | null;
  inspections?: Inspection[];
  services?: ServiceRecord[];
}

interface InspectionItem {
  id: string;
  name: string;
  status: "ok" | "warning" | "fail";
  notes?: string;
}
interface Inspection {
  id: string;
  vehicleId: string;
  inspectorId?: string | null;
  date: string;
  overallStatus: string;
  flagged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  items: string; // JSON
  notes?: string | null;
  odoReading?: number | null;
  vehicle?: { brand: string; model: string; plateNumber: string };
  inspector?: { name: string } | null;
}

interface ServicePart { name: string; qty: number; cost: number; }
interface ServiceRecord {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  date: string;
  mileage: number;
  cost: number;
  performedById?: string | null;
  supplier?: string | null;
  partsReplaced: string | ServicePart[];
  notes?: string | null;
  vehicle?: { brand: string; model: string; plateNumber: string };
  performedBy?: { name: string } | null;
}

interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  task: string;
  intervalType: string;
  intervalMileage?: number | null;
  intervalDays?: number | null;
  lastPerformedDate?: string | null;
  lastPerformedMileage?: number | null;
  nextDueDate?: string | null;
  nextDueMileage?: number | null;
  notes?: string | null;
  vehicle?: { brand: string; model: string; plateNumber: string; mileage: number };
  computedStatus?: "ok" | "due-soon" | "overdue";
  daysUntilDue?: number | null;
  mileageUntilDue?: number | null;
}

interface Employee { id: string; name: string; }

const VEHICLE_TYPES = ["car", "van", "truck", "motorcycle"];
const SERVICE_TYPES = [
  { value: "oil-change", label: "Oil change" },
  { value: "wheel-rotation", label: "Wheel rotation" },
  { value: "tire-replacement", label: "Tire replacement" },
  { value: "brake-service", label: "Brake service" },
  { value: "battery", label: "Battery replacement" },
  { value: "filter", label: "Filter replacement" },
  { value: "inspection", label: "Safety inspection" },
  { value: "repair", label: "General repair" },
  { value: "other", label: "Other" },
];

// Standard weekly inspection checklist
const INSPECTION_CHECKLIST = [
  { id: "tires", name: "Tires & tread" },
  { id: "brakes", name: "Brakes" },
  { id: "lights", name: "Lights (head/tail/indicators)" },
  { id: "fluids", name: "Fluid levels (oil/coolant/brake)" },
  { id: "wipers", name: "Wipers & washers" },
  { id: "body", name: "Body & mirrors" },
  { id: "seatbelts", name: "Seatbelts" },
  { id: "horn", name: "Horn" },
  { id: "exhaust", name: "Exhaust / emissions" },
  { id: "steering", name: "Steering & suspension" },
];

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString() : "—";

// ============================================================
// Main FleetView
// ============================================================
export function FleetView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("vehicles");
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/fleet/vehicles").then((r) => r.json()),
      fetch("/api/fleet/inspections").then((r) => r.json()),
      fetch("/api/fleet/services").then((r) => r.json()),
      fetch("/api/fleet/maintenance").then((r) => r.json()),
    ])
      .then(([v, i, s, m]) => {
        setVehicles(v);
        setInspections(i);
        setServices(s);
        setSchedules(m);
      })
      .catch(() => toast.error("Failed to load fleet data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then(setEmployees).catch(() => {});
    Promise.resolve().then(() => load());
  }, [load]);

  const totalDistance14d = 0; // not fetching logs here for brevity; dashboard already has it
  const flaggedCount = inspections.filter((i) => i.flagged && !i.acknowledgedBy).length;
  const overdueCount = schedules.filter((s) => s.computedStatus === "overdue").length;
  const dueSoonCount = schedules.filter((s) => s.computedStatus === "due-soon").length;
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const inMaintenance = vehicles.filter((v) => v.status === "maintenance").length;
  const totalPurchaseValue = vehicles.reduce((s, v) => s + (v.purchasePrice ?? 0), 0);
  const totalServiceCost = services.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Fleet Management"
        description="Vehicles, weekly driver inspections, service history & maintenance schedule with auto-flagging."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Vehicle
            </Button>
            <Button size="sm" variant="outline" onClick={() => setInspectionDialogOpen(true)}>
              <ClipboardList className="h-4 w-4 mr-1" /> Inspection
            </Button>
            <Button size="sm" variant="outline" onClick={() => setServiceDialogOpen(true)}>
              <Wrench className="h-4 w-4 mr-1" /> Log service
            </Button>
          </>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Vehicles" value={vehicles.length} hint={`${activeVehicles} active · ${inMaintenance} in maintenance`} icon={Truck} accent="teal" />
        <KpiCard label="Flagged inspections" value={flaggedCount} hint="Awaiting fleet controller" icon={AlertTriangle} accent={flaggedCount > 0 ? "rose" : "emerald"} />
        <KpiCard label="Overdue services" value={overdueCount} hint={`${dueSoonCount} due soon`} icon={Bell} accent={overdueCount > 0 ? "rose" : "emerald"} />
        <KpiCard label="Fleet value" value={`$${(totalPurchaseValue / 1000).toFixed(0)}k`} hint={`Total service cost: ${fmt(totalServiceCost)}`} icon={DollarSign} accent="amber" />
      </div>

      {/* Alerts banner */}
      {(flaggedCount > 0 || overdueCount > 0) && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 rounded-full bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <p className="font-semibold text-sm text-rose-700 dark:text-rose-300">Action required</p>
            </div>
            <div className="flex-1 text-sm text-rose-700/90 dark:text-rose-300/90 flex flex-wrap gap-x-4 gap-y-1">
              {flaggedCount > 0 && <span>{flaggedCount} flagged inspection{flaggedCount > 1 ? "s" : ""} need acknowledgement</span>}
              {overdueCount > 0 && <span>{overdueCount} overdue maintenance task{overdueCount > 1 ? "s" : ""}</span>}
            </div>
            <div className="flex gap-2 shrink-0">
              {flaggedCount > 0 && (
                <Button size="sm" variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300" onClick={() => setActiveTab("inspections")}>
                  Review inspections
                </Button>
              )}
              {overdueCount > 0 && (
                <Button size="sm" variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300" onClick={() => setActiveTab("maintenance")}>
                  View schedule
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto overflow-x-auto">
          <TabsTrigger value="vehicles"><Truck className="h-3.5 w-3.5 mr-1" /> Vehicles ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="inspections"><ClipboardList className="h-3.5 w-3.5 mr-1" /> Inspections ({inspections.length})</TabsTrigger>
          <TabsTrigger value="services"><History className="h-3.5 w-3.5 mr-1" /> Service History ({services.length})</TabsTrigger>
          <TabsTrigger value="maintenance"><Settings className="h-3.5 w-3.5 mr-1" /> Maintenance ({schedules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          <VehiclesTab
            vehicles={vehicles}
            loading={loading}
            onView={setDetailVehicle}
            onEdit={(v) => { setEditingVehicle(v); setVehicleDialogOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="inspections" className="mt-4">
          <InspectionsTab inspections={inspections} loading={loading} onAcknowledge={load} onView={setDetailVehicle} vehicles={vehicles} />
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <ServicesTab services={services} loading={loading} onView={setDetailVehicle} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <MaintenanceTab schedules={schedules} loading={loading} onMarkDone={load} onAdd={() => setScheduleDialogOpen(true)} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        editing={editingVehicle}
        onSaved={() => { setVehicleDialogOpen(false); load(); }}
      />
      <InspectionDialog
        open={inspectionDialogOpen}
        onOpenChange={setInspectionDialogOpen}
        vehicles={vehicles}
        employees={employees}
        onSaved={() => { setInspectionDialogOpen(false); load(); }}
      />
      <ServiceDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        vehicles={vehicles}
        employees={employees}
        onSaved={() => { setServiceDialogOpen(false); load(); }}
      />
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        vehicles={vehicles}
        onSaved={() => { setScheduleDialogOpen(false); load(); }}
      />

      {/* Vehicle detail drawer */}
      <VehicleDetailDrawer
        vehicle={detailVehicle}
        open={!!detailVehicle}
        onOpenChange={(o) => !o && setDetailVehicle(null)}
        onEdit={(v) => { setDetailVehicle(null); setEditingVehicle(v); setVehicleDialogOpen(true); }}
      />
    </div>
  );
}

// ============================================================
// Vehicles Tab — grid of vehicle cards with purchase data
// ============================================================
function VehiclesTab({
  vehicles, loading, onView, onEdit,
}: {
  vehicles: Vehicle[];
  loading: boolean;
  onView: (v: Vehicle) => void;
  onEdit: (v: Vehicle) => void;
}) {
  if (loading) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>;
  if (vehicles.length === 0) return <Card><CardContent className="p-0"><EmptyState title="No vehicles" description="Add a vehicle to start tracking." icon={Truck} /></CardContent></Card>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {vehicles.map((v) => {
        const insp = v.inspections?.[0];
        const svc = v.services?.[0];
        const insuranceSoon = v.insuranceExpiry && (new Date(v.insuranceExpiry).getTime() - Date.now()) < 60 * 86400000;
        return (
          <Card key={v.id} className="card-hover">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{v.brand} {v.model}</p>
                  <p className="text-xs text-muted-foreground">{v.year} · <span className="capitalize">{v.type}</span>{v.color ? ` · ${v.color}` : ""}</p>
                </div>
                <StatusBadge status={v.status} />
              </div>

              {/* Plate & VIN */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Plate</p>
                  <p className="font-mono font-medium">{v.plateNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">VIN</p>
                  <p className="font-mono text-[11px] truncate">{v.vin ?? "—"}</p>
                </div>
              </div>

              {/* Mileage & fuel */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> Mileage</p>
                  <p className="text-sm font-medium">{v.mileage.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Fuel className="h-3 w-3" /> Fuel</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Progress value={v.fuelLevel} className="h-1.5 flex-1" />
                    <span className={`text-xs font-medium ${v.fuelLevel < 30 ? "text-rose-600" : v.fuelLevel < 60 ? "text-amber-600" : "text-emerald-600"}`}>{v.fuelLevel}%</span>
                  </div>
                </div>
              </div>

              {/* Purchase data */}
              <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Purchase price</p>
                  <p className="font-medium">{v.purchasePrice != null ? fmt(v.purchasePrice) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Purchased</p>
                  <p className="font-medium">{fmtDate(v.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Insurance exp.</p>
                  <p className={`font-medium ${insuranceSoon ? "text-amber-600" : ""}`}>{fmtDate(v.insuranceExpiry)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reg. exp.</p>
                  <p className="font-medium">{fmtDate(v.registrationExpiry)}</p>
                </div>
              </div>

              {/* Assigned + recent activity */}
              <div className="mt-3 pt-3 border-t border-border/60 text-xs">
                <p className="text-muted-foreground">Assigned to</p>
                <p className="font-medium">{v.assignedTo ?? <span className="text-muted-foreground italic">Pool vehicle</span>}</p>
              </div>

              {(insp || svc) && (
                <div className="mt-3 pt-3 border-t border-border/60 text-xs space-y-1">
                  {insp && (
                    <p className="text-muted-foreground">
                      Last inspection: <StatusBadge status={insp.overallStatus} /> {fmtDate(insp.date)}
                    </p>
                  )}
                  {svc && (
                    <p className="text-muted-foreground">
                      Last service: <span className="text-foreground capitalize">{svc.type.replace("-", " ")}</span> · {fmtDate(svc.date)}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-border/60 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(v)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> History
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onEdit(v)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// Inspections Tab — list with auto-flagged highlighted
// ============================================================
function InspectionsTab({
  inspections, loading, onAcknowledge, onView, vehicles,
}: {
  inspections: Inspection[];
  loading: boolean;
  onAcknowledge: () => void;
  onView: (v: Vehicle) => void;
  vehicles: Vehicle[];
}) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "flagged"
    ? inspections.filter((i) => i.flagged && !i.acknowledgedBy)
    : filter === "all" ? inspections : inspections.filter((i) => i.overallStatus === filter);

  const acknowledge = async (id: string) => {
    const r = await fetch(`/api/fleet/inspections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledgedBy: "Sarah Chen (Fleet Controller)" }),
    });
    if (r.ok) {
      toast.success("Inspection acknowledged");
      onAcknowledge();
    } else toast.error("Acknowledge failed");
  };

  if (loading) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {["all", "pass", "warning", "fail", "flagged"].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "flagged" && <AlertTriangle className="h-3 w-3 mr-1" />}
            {f}
            <span className="ml-1 text-xs opacity-70">
              ({f === "all" ? inspections.length : f === "flagged" ? inspections.filter((i) => i.flagged && !i.acknowledgedBy).length : inspections.filter((i) => i.overallStatus === f).length})
            </span>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState title="No inspections match" description="Run a weekly inspection to see entries here." icon={ClipboardList} /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((insp) => {
            const items: InspectionItem[] = JSON.parse(insp.items);
            const issues = items.filter((i) => i.status !== "ok");
            const veh = vehicles.find((v) => v.id === insp.vehicleId);
            const flaggedUnack = insp.flagged && !insp.acknowledgedBy;
            return (
              <Card key={insp.id} className={flaggedUnack ? "border-rose-500/40 bg-rose-500/[0.03]" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{insp.vehicle?.brand} {insp.vehicle?.model}</p>
                        <span className="text-xs text-muted-foreground font-mono">{insp.vehicle?.plateNumber}</span>
                        <StatusBadge status={insp.overallStatus} />
                        {flaggedUnack && <Badge variant="destructive" className="text-[10px]">FLAGGED</Badge>}
                        {insp.acknowledgedBy && <Badge variant="outline" className="text-[10px] text-emerald-700">Acknowledged</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>{fmtDate(insp.date)}</span>
                        <span>Inspector: {insp.inspector?.name ?? "—"}</span>
                        <span>Odo: {(insp.odoReading ?? 0).toLocaleString()} km</span>
                      </div>

                      {issues.length > 0 ? (
                        <div className="mt-3 space-y-1.5">
                          {issues.map((i) => (
                            <div key={i.id} className="flex items-start gap-2 text-xs">
                              <span className={`mt-0.5 shrink-0 ${i.status === "fail" ? "text-rose-600" : "text-amber-600"}`}>
                                {i.status === "fail" ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                              </span>
                              <div>
                                <p className="font-medium">{i.name}</p>
                                {i.notes && <p className="text-muted-foreground">{i.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> All checklist items passed
                        </p>
                      )}

                      {insp.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{insp.notes}</p>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-2 shrink-0">
                      {veh && (
                        <Button size="sm" variant="outline" onClick={() => onView(veh)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Vehicle
                        </Button>
                      )}
                      {flaggedUnack && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => acknowledge(insp.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Services Tab — history with parts replaced
// ============================================================
function ServicesTab({
  services, loading, onView,
}: {
  services: ServiceRecord[];
  loading: boolean;
  onView: (v: Vehicle) => void;
}) {
  if (loading) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>;
  if (services.length === 0) return <Card><CardContent className="p-0"><EmptyState title="No service records" description="Log an oil change, wheel rotation, brake job or part replacement." icon={History} /></CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Parts replaced</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>By / Supplier</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => {
                const parts: ServicePart[] = typeof s.partsReplaced === "string" ? JSON.parse(s.partsReplaced as string) : s.partsReplaced;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{fmtDate(s.date)}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{s.vehicle?.brand} {s.vehicle?.model}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.vehicle?.plateNumber}</p>
                    </TableCell>
                    <TableCell><span className="capitalize text-sm">{s.type.replace("-", " ")}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.description}</TableCell>
                    <TableCell className="text-sm">{s.mileage.toLocaleString()} km</TableCell>
                    <TableCell className="text-xs">
                      {parts.length === 0 ? <span className="text-muted-foreground">—</span> : (
                        <div className="space-y-0.5">
                          {parts.map((p, i) => <p key={i}>{p.qty}× {p.name} <span className="text-muted-foreground">({fmt(p.cost)})</span></p>)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{fmt(s.cost)}</TableCell>
                    <TableCell className="text-xs">
                      <p>{s.performedBy?.name ?? "—"}</p>
                      <p className="text-muted-foreground">{s.supplier ?? ""}</p>
                    </TableCell>
                    <TableCell>
                      {s.vehicle && <Button size="sm" variant="ghost" onClick={() => onView({ id: s.vehicleId, brand: s.vehicle!.brand, model: s.vehicle!.model, plateNumber: s.vehicle!.plateNumber } as Vehicle)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {services.slice(0, 50).map((s) => {
            const parts: ServicePart[] = typeof s.partsReplaced === "string" ? JSON.parse(s.partsReplaced as string) : s.partsReplaced;
            return (
              <div key={s.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.vehicle?.brand} {s.vehicle?.model}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.vehicle?.plateNumber}</p>
                  </div>
                  <span className="text-sm font-medium">{fmt(s.cost)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{s.type.replace("-", " ")} · {fmtDate(s.date)} · {s.mileage.toLocaleString()} km</p>
                <p className="text-xs mt-1">{s.description}</p>
                {parts.length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="text-muted-foreground">Parts:</p>
                    {parts.map((p, i) => <p key={i}>{p.qty}× {p.name} — {fmt(p.cost)}</p>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Maintenance Tab — schedule with due/overdue status
// ============================================================
function MaintenanceTab({
  schedules, loading, onMarkDone, onAdd,
}: {
  schedules: MaintenanceSchedule[];
  loading: boolean;
  onMarkDone: () => void;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "overdue" | "due-soon" | "ok">("all");
  const filtered = filter === "all" ? schedules : schedules.filter((s) => s.computedStatus === filter);
  const counts = {
    overdue: schedules.filter((s) => s.computedStatus === "overdue").length,
    "due-soon": schedules.filter((s) => s.computedStatus === "due-soon").length,
    ok: schedules.filter((s) => s.computedStatus === "ok").length,
  };

  const markDone = async (id: string, vehicleId: string) => {
    const veh = schedules.find((s) => s.id === id)?.vehicle;
    const r = await fetch(`/api/fleet/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-done", mileage: veh?.mileage ?? 0 }),
    });
    if (r.ok) {
      toast.success("Marked complete — next due recalculated");
      onMarkDone();
    } else toast.error("Update failed");
  };

  if (loading) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        {(["all", "overdue", "due-soon", "ok"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
            {f.replace("-", " ")}
            <span className="ml-1 text-xs opacity-70">({counts[f] ?? schedules.length})</span>
          </Button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add schedule
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState title="No scheduled tasks" description="Add a recurring maintenance task per vehicle." icon={Settings} /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id} className={s.computedStatus === "overdue" ? "border-rose-500/40 bg-rose-500/[0.03]" : s.computedStatus === "due-soon" ? "border-amber-500/30" : ""}>
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{s.task}</p>
                      <StatusBadge status={s.computedStatus ?? "ok"} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.vehicle?.brand} {s.vehicle?.model} · <span className="font-mono">{s.vehicle?.plateNumber}</span>
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Interval</p>
                        <p className="font-medium">
                          {s.intervalMileage ? `${s.intervalMileage.toLocaleString()} km` : ""}
                          {s.intervalMileage && s.intervalDays ? " / " : ""}
                          {s.intervalDays ? `${s.intervalDays}d` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last done</p>
                        <p className="font-medium">{fmtDate(s.lastPerformedDate)}</p>
                        <p className="text-[10px] text-muted-foreground">{s.lastPerformedMileage?.toLocaleString() ?? 0} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next due</p>
                        <p className={`font-medium ${s.computedStatus === "overdue" ? "text-rose-600" : s.computedStatus === "due-soon" ? "text-amber-600" : ""}`}>
                          {fmtDate(s.nextDueDate)}
                        </p>
                        {s.daysUntilDue !== null && s.daysUntilDue !== undefined && (
                          <p className="text-[10px] text-muted-foreground">
                            {s.daysUntilDue >= 0 ? `in ${s.daysUntilDue}d` : `${Math.abs(s.daysUntilDue)}d overdue`}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next at mileage</p>
                        <p className="font-medium">{s.nextDueMileage?.toLocaleString() ?? "—"} km</p>
                        {s.mileageUntilDue !== null && s.mileageUntilDue !== undefined && s.vehicle && (
                          <p className="text-[10px] text-muted-foreground">
                            {s.mileageUntilDue >= 0 ? `${s.mileageUntilDue.toLocaleString()} km to go` : `${Math.abs(s.mileageUntilDue).toLocaleString()} km past`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => markDone(s.id, s.vehicleId)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark done
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Vehicle Dialog (add/edit) — extended with purchase fields
// ============================================================
function VehicleDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Vehicle | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Vehicle>>({});
  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      if (editing) {
        setForm({
          ...editing,
          purchaseDate: editing.purchaseDate ? new Date(editing.purchaseDate).toISOString().slice(0, 10) : "",
          insuranceExpiry: editing.insuranceExpiry ? new Date(editing.insuranceExpiry).toISOString().slice(0, 10) : "",
          registrationExpiry: editing.registrationExpiry ? new Date(editing.registrationExpiry).toISOString().slice(0, 10) : "",
        });
      } else {
        setForm({
          plateNumber: "", brand: "", model: "", year: new Date().getFullYear(), type: "van",
          status: "active", assignedTo: "", mileage: 0, fuelLevel: 100,
          vin: "", purchasePrice: 0, purchaseDate: "", supplier: "", color: "",
          insuranceExpiry: "", registrationExpiry: "",
        });
      }
    });
  }, [open, editing]);

  const save = async () => {
    if (!form.plateNumber || !form.brand) { toast.error("Plate number and brand required"); return; }
    const url = editing ? `/api/fleet/vehicles/${editing.id}` : "/api/fleet/vehicles";
    const method = editing ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success(editing ? "Vehicle updated" : "Vehicle added");
      onSaved();
    } else toast.error("Save failed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>{editing ? `Update ${editing.brand} ${editing.model}` : "Register a new vehicle with purchase data"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Plate number *</Label><Input value={form.plateNumber ?? ""} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>VIN</Label><Input value={form.vin ?? ""} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="1FTBR1X8XNKA12345" /></div>
          <div className="space-y-1.5"><Label>Brand *</Label><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Model</Label><Input value={form.model ?? ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Type</Label><Select value={form.type ?? "van"} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Color</Label><Input value={form.color ?? ""} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="White" /></div>
          <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={form.year ?? new Date().getFullYear()} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Status</Label><Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["active", "maintenance", "retired"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Mileage (km)</Label><Input type="number" value={form.mileage ?? 0} onChange={(e) => setForm({ ...form, mileage: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Fuel level (%)</Label><Input type="number" min={0} max={100} value={form.fuelLevel ?? 100} onChange={(e) => setForm({ ...form, fuelLevel: Number(e.target.value) })} /></div>
          <div className="space-y-1.5 col-span-2"><Label>Assigned to</Label><Input value={form.assignedTo ?? ""} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="Driver name or empty for pool" /></div>

          <div className="col-span-2 mt-2 pt-3 border-t">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Purchase & Registration</p>
          </div>
          <div className="space-y-1.5"><Label>Purchase price ($)</Label><Input type="number" value={form.purchasePrice ?? 0} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Purchase date</Label><Input type="date" value={form.purchaseDate ?? ""} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
          <div className="space-y-1.5 col-span-2"><Label>Supplier / dealership</Label><Input value={form.supplier ?? ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="City Ford Dealership" /></div>
          <div className="space-y-1.5"><Label>Insurance expiry</Label><Input type="date" value={form.insuranceExpiry ?? ""} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Registration expiry</Label><Input type="date" value={form.registrationExpiry ?? ""} onChange={(e) => setForm({ ...form, registrationExpiry: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save changes" : "Add vehicle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Inspection Dialog — weekly checklist form
// ============================================================
function InspectionDialog({
  open, onOpenChange, vehicles, employees, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: Vehicle[];
  employees: Employee[];
  onSaved: () => void;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odoReading, setOdoReading] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InspectionItem[]>(
    INSPECTION_CHECKLIST.map((t) => ({ ...t, status: "ok", notes: "" })),
  );

  useEffect(() => {
    if (open && vehicles.length > 0 && !vehicleId) {
      Promise.resolve().then(() => {
        setVehicleId(vehicles[0].id);
        setOdoReading(vehicles[0].mileage);
      });
    }
  }, [open, vehicles, vehicleId]);

  const setItem = (idx: number, patch: Partial<InspectionItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const save = async () => {
    if (!vehicleId) { toast.error("Select a vehicle"); return; }
    const r = await fetch("/api/fleet/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, inspectorId: inspectorId || null, date, odoReading, notes, items }),
    });
    if (r.ok) {
      const data = await r.json();
      if (data.flagged) {
        toast.warning("Inspection submitted — flagged for fleet controller review", {
          description: `${data.overallStatus.toUpperCase()} — vehicle status set to maintenance`,
        });
      } else {
        toast.success("Inspection submitted — all passed");
      }
      onSaved();
      // Reset form
      setItems(INSPECTION_CHECKLIST.map((t) => ({ ...t, status: "ok", notes: "" })));
      setNotes("");
    } else toast.error("Submit failed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weekly vehicle inspection</DialogTitle>
          <DialogDescription>Driver checklist — any warning/fail auto-flags the fleet controller</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Vehicle *</Label>
            <Select value={vehicleId} onValueChange={(v) => {
              setVehicleId(v);
              const veh = vehicles.find((x) => x.id === v);
              if (veh) setOdoReading(veh.mileage);
            }}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plateNumber}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Inspector (driver)</Label>
            <Select value={inspectorId} onValueChange={setInspectorId}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Odometer (km)</Label>
            <Input type="number" value={odoReading} onChange={(e) => setOdoReading(Number(e.target.value))} />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Checklist</p>
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
            {items.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center p-2 rounded-md border border-border/60">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{it.name}</p>
                  {it.notes && <p className="text-[11px] text-amber-700 dark:text-amber-400 truncate">{it.notes}</p>}
                </div>
                <Select value={it.status} onValueChange={(v) => setItem(idx, { status: v as InspectionItem["status"] })}>
                  <SelectTrigger className={`h-7 w-28 text-xs ${it.status === "fail" ? "border-rose-500/50 text-rose-700" : it.status === "warning" ? "border-amber-500/50 text-amber-700" : "border-emerald-500/50 text-emerald-700"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok" className="text-emerald-700">✓ OK</SelectItem>
                    <SelectItem value="warning" className="text-amber-700">⚠ Warning</SelectItem>
                    <SelectItem value="fail" className="text-rose-700">✕ Fail</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Notes"
                  value={it.notes ?? ""}
                  onChange={(e) => setItem(idx, { notes: e.target.value })}
                  className="h-7 text-xs w-32"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>General notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional overall notes" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Submit inspection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Service Dialog — log a service with parts replaced
// ============================================================
function ServiceDialog({
  open, onOpenChange, vehicles, employees, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: Vehicle[];
  employees: Employee[];
  onSaved: () => void;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [type, setType] = useState("oil-change");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState(0);
  const [cost, setCost] = useState(0);
  const [performedById, setPerformedById] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [parts, setParts] = useState<ServicePart[]>([]);

  useEffect(() => {
    if (open && vehicles.length > 0 && !vehicleId) {
      Promise.resolve().then(() => {
        setVehicleId(vehicles[0].id);
        setMileage(vehicles[0].mileage);
      });
    }
  }, [open, vehicles, vehicleId]);

  const addPart = () => setParts([...parts, { name: "", qty: 1, cost: 0 }]);
  const updatePart = (i: number, patch: Partial<ServicePart>) => setParts(parts.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removePart = (i: number) => setParts(parts.filter((_, idx) => idx !== i));
  const partsTotal = parts.reduce((s, p) => s + p.cost * p.qty, 0);

  const save = async () => {
    if (!vehicleId) { toast.error("Select a vehicle"); return; }
    const r = await fetch("/api/fleet/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId,
        type,
        description: description || (SERVICE_TYPES.find((t) => t.value === type)?.label ?? ""),
        date,
        mileage,
        cost: cost || partsTotal,
        performedById: performedById || null,
        supplier: supplier || null,
        partsReplaced: parts,
        notes,
      }),
    });
    if (r.ok) {
      toast.success("Service logged — maintenance schedule updated");
      onSaved();
      // Reset
      setDescription(""); setCost(0); setParts([]); setNotes(""); setSupplier("");
    } else toast.error("Save failed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log service / repair</DialogTitle>
          <DialogDescription>Record maintenance, part replacements, wheel rotations — updates vehicle history & schedule</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Vehicle *</Label>
            <Select value={vehicleId} onValueChange={(v) => {
              setVehicleId(v);
              const veh = vehicles.find((x) => x.id === v);
              if (veh) setMileage(veh.mileage);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plateNumber}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Service type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Mileage (km)</Label><Input type="number" value={mileage} onChange={(e) => setMileage(Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Total cost ($)</Label><Input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} placeholder={partsTotal ? `Default: ${partsTotal.toFixed(2)}` : "0"} /></div>
          <div className="space-y-1.5 col-span-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of work done" /></div>
          <div className="space-y-1.5">
            <Label>Performed by</Label>
            <Select value={performedById} onValueChange={setPerformedById}>
              <SelectTrigger><SelectValue placeholder="Mechanic / employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Supplier / workshop</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="City Auto Workshop" /></div>
        </div>

        {/* Parts replaced */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Parts replaced</p>
            <Button size="sm" variant="outline" onClick={addPart}><Plus className="h-3 w-3 mr-1" /> Add part</Button>
          </div>
          {parts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No parts logged for this service</p>
          ) : (
            <div className="space-y-1.5">
              {parts.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_90px_auto] gap-2 items-center">
                  <Input placeholder="Part name" value={p.name} onChange={(e) => updatePart(i, { name: e.target.value })} className="h-8 text-sm" />
                  <Input type="number" min={1} placeholder="Qty" value={p.qty} onChange={(e) => updatePart(i, { qty: Number(e.target.value) })} className="h-8 text-sm" />
                  <Input type="number" min={0} placeholder="Cost" value={p.cost} onChange={(e) => updatePart(i, { cost: Number(e.target.value) })} className="h-8 text-sm" />
                  <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => removePart(i)}>
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-right">Parts total: <span className="font-medium text-foreground">{fmt(partsTotal)}</span></p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Log service</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Schedule Dialog — add a recurring maintenance task
// ============================================================
function ScheduleDialog({
  open, onOpenChange, vehicles, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: Vehicle[];
  onSaved: () => void;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [task, setTask] = useState("");
  const [intervalType, setIntervalType] = useState("both");
  const [intervalMileage, setIntervalMileage] = useState(10000);
  const [intervalDays, setIntervalDays] = useState(365);
  const [lastPerformedDate, setLastPerformedDate] = useState(new Date().toISOString().slice(0, 10));
  const [lastPerformedMileage, setLastPerformedMileage] = useState(0);

  useEffect(() => {
    if (open && vehicles.length > 0 && !vehicleId) {
      Promise.resolve().then(() => {
        setVehicleId(vehicles[0].id);
        setLastPerformedMileage(vehicles[0].mileage);
      });
    }
  }, [open, vehicles, vehicleId]);

  const save = async () => {
    if (!vehicleId || !task) { toast.error("Vehicle and task are required"); return; }
    const r = await fetch("/api/fleet/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId, task, intervalType,
        intervalMileage: intervalType === "mileage" || intervalType === "both" ? intervalMileage : null,
        intervalDays: intervalType === "time" || intervalType === "both" ? intervalDays : null,
        lastPerformedDate, lastPerformedMileage,
      }),
    });
    if (r.ok) {
      toast.success("Schedule added — next due calculated");
      onSaved();
      setTask("");
    } else toast.error("Save failed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add maintenance schedule</DialogTitle>
          <DialogDescription>Recurring task — next due is auto-calculated</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Vehicle *</Label>
            <Select value={vehicleId} onValueChange={(v) => {
              setVehicleId(v);
              const veh = vehicles.find((x) => x.id === v);
              if (veh) setLastPerformedMileage(veh.mileage);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plateNumber}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Task *</Label>
            <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Wheel rotation, Oil change, Brake inspection" />
          </div>
          <div className="space-y-1.5">
            <Label>Interval type</Label>
            <Select value={intervalType} onValueChange={setIntervalType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Mileage + time</SelectItem>
                <SelectItem value="mileage">Mileage only</SelectItem>
                <SelectItem value="time">Time only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(intervalType === "mileage" || intervalType === "both") && (
            <div className="space-y-1.5">
              <Label>Every N km</Label>
              <Input type="number" value={intervalMileage} onChange={(e) => setIntervalMileage(Number(e.target.value))} />
            </div>
          )}
          {(intervalType === "time" || intervalType === "both") && (
            <div className="space-y-1.5">
              <Label>Every N days</Label>
              <Input type="number" value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Last performed date</Label>
              <Input type="date" value={lastPerformedDate} onChange={(e) => setLastPerformedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last performed mileage</Label>
              <Input type="number" value={lastPerformedMileage} onChange={(e) => setLastPerformedMileage(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Add schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Vehicle Detail Drawer — full history timeline
// ============================================================
function VehicleDetailDrawer({
  vehicle, open, onOpenChange, onEdit,
}: {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (v: Vehicle) => void;
}) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    Promise.resolve().then(() => setLoading(true));
    Promise.all([
      fetch(`/api/fleet/inspections?vehicleId=${vehicle.id}`).then((r) => r.json()),
      fetch(`/api/fleet/services?vehicleId=${vehicle.id}`).then((r) => r.json()),
      fetch(`/api/fleet/maintenance?vehicleId=${vehicle.id}`).then((r) => r.json()),
    ]).then(([i, s, m]) => {
      setInspections(i);
      setServices(s);
      setSchedules(m);
    }).finally(() => setLoading(false));
  }, [vehicle]);

  if (!vehicle) return null;

  // Build unified timeline
  type TimelineEvent = { date: string; type: "inspection" | "service"; data: Inspection | ServiceRecord };
  const timeline: TimelineEvent[] = [
    ...inspections.map((i) => ({ date: i.date, type: "inspection" as const, data: i as Inspection | ServiceRecord })),
    ...services.map((s) => ({ date: s.date, type: "service" as const, data: s as Inspection | ServiceRecord })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="px-5 py-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center justify-between gap-2">
            <span className="truncate">{vehicle.brand} {vehicle.model}</span>
            <Button size="sm" variant="outline" onClick={() => onEdit(vehicle)} className="shrink-0">
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          </SheetTitle>
          <p className="text-xs text-muted-foreground font-mono">{vehicle.plateNumber} · {vehicle.year} · <span className="capitalize">{vehicle.type}</span></p>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">Mileage</p>
              <p className="text-lg font-bold">{vehicle.mileage.toLocaleString()} km</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">Fuel</p>
              <p className="text-lg font-bold">{vehicle.fuelLevel}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">Purchase price</p>
              <p className="text-lg font-bold">{vehicle.purchasePrice != null ? fmt(vehicle.purchasePrice) : "—"}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">Status</p>
              <div className="mt-1"><StatusBadge status={vehicle.status} /></div>
            </CardContent></Card>
          </div>

          {/* Purchase & registration */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Purchase & Registration</CardTitle></CardHeader>
            <CardContent className="pt-0 text-xs">
              <StatRow label="VIN" value={vehicle.vin ?? "—"} mono />
              <StatRow label="Purchased" value={fmtDate(vehicle.purchaseDate)} />
              <StatRow label="Supplier" value={vehicle.supplier ?? "—"} />
              <StatRow label="Color" value={vehicle.color ?? "—"} />
              <StatRow label="Insurance expires" value={fmtDate(vehicle.insuranceExpiry)} />
              <StatRow label="Registration expires" value={fmtDate(vehicle.registrationExpiry)} />
              <StatRow label="Assigned to" value={vehicle.assignedTo ?? "Pool vehicle"} />
            </CardContent>
          </Card>

          {/* Upcoming maintenance */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Settings className="h-3.5 w-3.5" /> Upcoming Maintenance</CardTitle></CardHeader>
            <CardContent className="pt-0">
              {schedules.length === 0 ? <p className="text-xs text-muted-foreground">No scheduled tasks</p> : (
                <div className="space-y-1.5">
                  {schedules.filter((s) => s.computedStatus !== "ok").slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium truncate">{s.task}</span>
                      <StatusBadge status={s.computedStatus ?? "ok"} />
                    </div>
                  ))}
                  {schedules.filter((s) => s.computedStatus !== "ok").length === 0 && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">All up to date</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History timeline */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><History className="h-3.5 w-3.5" /> Vehicle History</CardTitle></CardHeader>
            <CardContent className="pt-0">
              {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
                timeline.length === 0 ? <p className="text-xs text-muted-foreground">No history yet</p> : (
                <div className="space-y-2">
                  {timeline.slice(0, 20).map((evt, i) => {
                    if (evt.type === "inspection") {
                      const insp = evt.data as Inspection;
                      const items: InspectionItem[] = JSON.parse(insp.items);
                      const issues = items.filter((it) => it.status !== "ok");
                      return (
                        <div key={i} className="flex gap-3 text-xs">
                          <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${insp.overallStatus === "pass" ? "bg-emerald-500/15 text-emerald-700" : insp.overallStatus === "warning" ? "bg-amber-500/15 text-amber-700" : "bg-rose-500/15 text-rose-700"}`}>
                            <ClipboardList className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0 pb-2 border-b border-border/40 last:border-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">Inspection — {insp.overallStatus}</p>
                              <span className="text-muted-foreground">{fmtDate(insp.date)}</span>
                            </div>
                            <p className="text-muted-foreground mt-0.5">{insp.inspector?.name ?? "Unknown"} · {(insp.odoReading ?? 0).toLocaleString()} km</p>
                            {issues.length > 0 && (
                              <p className="text-amber-700 dark:text-amber-400 mt-0.5">{issues.length} issue{issues.length > 1 ? "s" : ""}: {issues.map((x) => x.name).join(", ")}</p>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      const svc = evt.data as ServiceRecord;
                      const parts: ServicePart[] = typeof svc.partsReplaced === "string" ? JSON.parse(svc.partsReplaced as string) : svc.partsReplaced;
                      return (
                        <div key={i} className="flex gap-3 text-xs">
                          <div className="mt-0.5 h-6 w-6 rounded-full bg-teal-500/15 text-teal-700 flex items-center justify-center shrink-0">
                            <Wrench className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0 pb-2 border-b border-border/40 last:border-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium capitalize">{svc.type.replace("-", " ")} — {fmt(svc.cost)}</p>
                              <span className="text-muted-foreground">{fmtDate(svc.date)}</span>
                            </div>
                            <p className="text-muted-foreground mt-0.5">{svc.description}</p>
                            {parts.length > 0 && (
                              <p className="text-muted-foreground mt-0.5">Parts: {parts.map((p) => `${p.qty}× ${p.name}`).join(", ")}</p>
                            )}
                            <p className="text-muted-foreground mt-0.5">{svc.performedBy?.name ?? "—"} · {svc.mileage.toLocaleString()} km</p>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
