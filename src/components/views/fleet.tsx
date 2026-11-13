"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Truck, Plus, Fuel, Route, Wrench, Gauge, MapPin } from "lucide-react";
import { toast } from "sonner";

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
  logs?: FleetLog[];
}

interface FleetLog {
  id: string;
  vehicleId: string;
  employeeId: string | null;
  date: string;
  startOdometer: number;
  endOdometer: number;
  distance: number;
  fuelCost: number;
  purpose: string;
  vehicle?: { plateNumber: string; brand: string; model: string };
  employee?: { name: string } | null;
}

interface Employee { id: string; name: string; }

const VEHICLE_TYPES = ["car", "van", "truck", "motorcycle"];

export function FleetView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<FleetLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({ plateNumber: "", brand: "", model: "", year: new Date().getFullYear(), type: "van", assignedTo: "", mileage: 0, fuelLevel: 100 });
  const [logForm, setLogForm] = useState<{ vehicleId: string; employeeId: string; date: string; startOdometer: number; endOdometer: number; fuelCost: number; purpose: string }>({
    vehicleId: "", employeeId: "", date: new Date().toISOString().slice(0, 10), startOdometer: 0, endOdometer: 0, fuelCost: 0, purpose: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/fleet/vehicles").then((r) => r.json()),
      fetch("/api/fleet/logs").then((r) => r.json()),
    ])
      .then(([v, l]) => { setVehicles(v); setLogs(l); })
      .catch(() => toast.error("Failed to load fleet data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then(setEmployees).catch(() => {});
    Promise.resolve().then(() => load());
  }, [load]);

  const totalDistance = logs.reduce((s, l) => s + l.distance, 0);
  const totalFuelCost = logs.reduce((s, l) => s + l.fuelCost, 0);
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const inMaintenance = vehicles.filter((v) => v.status === "maintenance").length;

  const saveVehicle = async () => {
    if (!vehicleForm.plateNumber || !vehicleForm.brand) { toast.error("Plate number and brand required"); return; }
    const r = await fetch("/api/fleet/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicleForm),
    });
    if (r.ok) {
      toast.success("Vehicle added");
      setVehicleDialogOpen(false);
      load();
    } else toast.error("Save failed");
  };

  const saveLog = async () => {
    if (!logForm.vehicleId) { toast.error("Select a vehicle"); return; }
    if (logForm.endOdometer < logForm.startOdometer) { toast.error("End odometer must be ≥ start"); return; }
    const r = await fetch("/api/fleet/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...logForm,
        employeeId: logForm.employeeId || null,
      }),
    });
    if (r.ok) {
      toast.success("Trip logged");
      setLogDialogOpen(false);
      load();
    } else toast.error("Save failed");
  };

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Fleet Tracking"
        description="Vehicles, trips, mileage and fuel cost tracking."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setLogDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log trip
            </Button>
            <Button size="sm" onClick={() => setVehicleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add vehicle
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center"><Truck className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Vehicles</p><p className="text-xl font-bold">{vehicles.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Route className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Distance (14d)</p><p className="text-xl font-bold">{totalDistance.toLocaleString()} km</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center"><Fuel className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Fuel cost (14d)</p><p className="text-xl font-bold">{fmt(totalFuelCost)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center"><Wrench className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">In maintenance</p><p className="text-xl font-bold">{inMaintenance}</p><p className="text-xs text-muted-foreground">{activeVehicles} active</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="trips">Trip Logs ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          {loading ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
          ) : vehicles.length === 0 ? (
            <Card><CardContent className="p-0"><EmptyState title="No vehicles" description="Add a vehicle to start tracking trips." /></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vehicles.map((v) => (
                <Card key={v.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{v.brand} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.year} · <span className="capitalize">{v.type}</span></p>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Plate</p>
                        <p className="font-medium font-mono">{v.plateNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> Mileage</p>
                        <p className="font-medium">{v.mileage.toLocaleString()} km</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground flex items-center gap-1"><Fuel className="h-3 w-3" /> Fuel level</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={v.fuelLevel} className="h-1.5 flex-1" />
                          <span className={`text-xs font-medium ${v.fuelLevel < 30 ? "text-rose-600" : v.fuelLevel < 60 ? "text-amber-600" : "text-emerald-600"}`}>{v.fuelLevel}%</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Assigned to</p>
                        <p className="font-medium">{v.assignedTo ?? <span className="text-muted-foreground italic">Pool vehicle</span>}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : logs.length === 0 ? (
                <EmptyState title="No trips logged" description="Use Log Trip to record vehicle journeys." />
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Start odo</TableHead>
                          <TableHead>End odo</TableHead>
                          <TableHead>Distance</TableHead>
                          <TableHead>Fuel cost</TableHead>
                          <TableHead>Purpose</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.slice(0, 100).map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="text-sm">{new Date(l.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm">
                              <p className="font-medium">{l.vehicle?.brand} {l.vehicle?.model}</p>
                              <p className="text-xs text-muted-foreground font-mono">{l.vehicle?.plateNumber}</p>
                            </TableCell>
                            <TableCell className="text-sm">{l.employee?.name ?? "—"}</TableCell>
                            <TableCell className="text-sm">{l.startOdometer.toLocaleString()}</TableCell>
                            <TableCell className="text-sm">{l.endOdometer.toLocaleString()}</TableCell>
                            <TableCell className="text-sm font-medium">{l.distance} km</TableCell>
                            <TableCell className="text-sm">{fmt(l.fuelCost)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{l.purpose}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden divide-y">
                    {logs.slice(0, 50).map((l) => (
                      <div key={l.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{l.vehicle?.brand} {l.vehicle?.model}</p>
                            <p className="text-xs text-muted-foreground font-mono">{l.vehicle?.plateNumber} · {new Date(l.date).toLocaleDateString()}</p>
                          </div>
                          <span className="text-sm font-medium">{l.distance} km</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Driver: {l.employee?.name ?? "—"}</span>
                          <span>Fuel: {fmt(l.fuelCost)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{l.purpose}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add vehicle dialog */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add vehicle</DialogTitle>
            <DialogDescription>Register a new vehicle in the fleet</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plate number *</Label>
                <Input value={vehicleForm.plateNumber ?? ""} onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })} placeholder="WH-101-A" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={vehicleForm.type ?? "van"} onValueChange={(v) => setVehicleForm({ ...vehicleForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Brand *</Label>
                <Input value={vehicleForm.brand ?? ""} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} placeholder="Ford" />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input value={vehicleForm.model ?? ""} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="Transit" />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={vehicleForm.year ?? new Date().getFullYear()} onChange={(e) => setVehicleForm({ ...vehicleForm, year: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mileage (km)</Label>
                <Input type="number" value={vehicleForm.mileage ?? 0} onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fuel level (%)</Label>
                <Input type="number" min={0} max={100} value={vehicleForm.fuelLevel ?? 100} onChange={(e) => setVehicleForm({ ...vehicleForm, fuelLevel: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned to</Label>
                <Input value={vehicleForm.assignedTo ?? ""} onChange={(e) => setVehicleForm({ ...vehicleForm, assignedTo: e.target.value })} placeholder="Driver name or empty for pool" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveVehicle}>Add vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log trip dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log a trip</DialogTitle>
            <DialogDescription>Record a vehicle journey with odometer readings</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Vehicle *</Label>
              <Select value={logForm.vehicleId} onValueChange={(v) => {
                const veh = vehicles.find((x) => x.id === v);
                setLogForm({ ...logForm, vehicleId: v, startOdometer: veh?.mileage ?? 0, endOdometer: veh?.mileage ?? 0 });
              }}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plateNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Driver</Label>
              <Select value={logForm.employeeId} onValueChange={(v) => setLogForm({ ...logForm, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fuel cost ($)</Label>
                <Input type="number" min={0} step={0.01} value={logForm.fuelCost} onChange={(e) => setLogForm({ ...logForm, fuelCost: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Start odometer</Label>
                <Input type="number" value={logForm.startOdometer} onChange={(e) => setLogForm({ ...logForm, startOdometer: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>End odometer</Label>
                <Input type="number" value={logForm.endOdometer} onChange={(e) => setLogForm({ ...logForm, endOdometer: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Input value={logForm.purpose} onChange={(e) => setLogForm({ ...logForm, purpose: e.target.value })} placeholder="Delivery run, customer visit, etc." />
            </div>
            {logForm.endOdometer >= logForm.startOdometer && (
              <p className="text-xs text-muted-foreground">Distance: <span className="font-medium text-foreground">{logForm.endOdometer - logForm.startOdometer} km</span></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveLog}>Log trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
