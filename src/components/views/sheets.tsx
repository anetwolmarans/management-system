"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Table2, Plus, Trash2, Pencil, ChevronDown, ChevronRight, Download, Copy } from "lucide-react";
import { toast } from "sonner";

interface SheetColumn {
  id: string;
  name: string;
  type: "text" | "number" | "select" | "date";
  options?: string[];
}
interface SheetRow {
  [colId: string]: string | number;
}
interface Sheet {
  id: string;
  name: string;
  description: string | null;
  columns: SheetColumn[];
  rows: SheetRow[];
  updatedAt: string;
}

const COLUMN_TYPES: SheetColumn["type"][] = ["text", "number", "select", "date"];

export function SheetsView() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [newSheet, setNewSheet] = useState<{ name: string; description: string }>({ name: "", description: "" });
  const [newCol, setNewCol] = useState<{ name: string; type: SheetColumn["type"]; options: string }>({ name: "", type: "text", options: "" });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/sheets")
      .then((r) => r.json())
      .then((data: Sheet[]) => {
        setSheets(data);
        if (data.length > 0 && !activeId) setActiveId(data[0].id);
      })
      .catch(() => toast.error("Failed to load sheets"))
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const active = sheets.find((s) => s.id === activeId) ?? null;

  const persistSheet = async (updated: Sheet) => {
    const r = await fetch(`/api/sheets/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: updated.name,
        description: updated.description,
        columns: updated.columns,
        rows: updated.rows,
      }),
    });
    if (!r.ok) {
      toast.error("Save failed");
      return false;
    }
    // Update local state optimistically
    setSheets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    return true;
  };

  const createSheet = async () => {
    if (!newSheet.name) { toast.error("Name is required"); return; }
    const r = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSheet),
    });
    if (r.ok) {
      const created = await r.json();
      toast.success("Sheet created");
      setNewDialogOpen(false);
      setNewSheet({ name: "", description: "" });
      setSheets((prev) => [created, ...prev]);
      setActiveId(created.id);
    } else toast.error("Create failed");
  };

  const deleteSheet = async (id: string) => {
    if (!confirm("Delete this sheet and all its rows?")) return;
    const r = await fetch(`/api/sheets/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Sheet deleted");
      setSheets((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) setActiveId(null);
    } else toast.error("Delete failed");
  };

  const addColumn = async () => {
    if (!active || !newCol.name) { toast.error("Column name required"); return; }
    const col: SheetColumn = {
      id: `c${Date.now()}`,
      name: newCol.name,
      type: newCol.type,
      ...(newCol.type === "select" && newCol.options ? { options: newCol.options.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
    };
    const updated: Sheet = {
      ...active,
      columns: [...active.columns, col],
      rows: active.rows.map((r) => ({ ...r, [col.id]: "" })),
    };
    if (await persistSheet(updated)) {
      setColDialogOpen(false);
      setNewCol({ name: "", type: "text", options: "" });
    }
  };

  const addRow = async () => {
    if (!active) return;
    const newRow: SheetRow = {};
    for (const c of active.columns) {
      newRow[c.id] = c.type === "number" ? 0 : "";
    }
    await persistSheet({ ...active, rows: [...active.rows, newRow] });
  };

  const updateCell = async (rowIdx: number, colId: string, value: string | number) => {
    if (!active) return;
    const rows = [...active.rows];
    rows[rowIdx] = { ...rows[rowIdx], [colId]: value };
    await persistSheet({ ...active, rows });
  };

  const deleteRow = async (rowIdx: number) => {
    if (!active) return;
    const rows = active.rows.filter((_, i) => i !== rowIdx);
    await persistSheet({ ...active, rows });
  };

  const deleteColumn = async (colId: string) => {
    if (!active) return;
    if (!confirm("Delete this column and all its values?")) return;
    const columns = active.columns.filter((c) => c.id !== colId);
    const rows = active.rows.map((r) => {
      const rest = { ...r };
      delete rest[colId];
      return rest;
    });
    await persistSheet({ ...active, columns, rows });
  };

  const duplicateSheet = async (s: Sheet) => {
    const r = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${s.name} (copy)`, description: s.description, columns: s.columns, rows: s.rows }),
    });
    if (r.ok) {
      const created = await r.json();
      toast.success("Sheet duplicated");
      setSheets((prev) => [created, ...prev]);
      setActiveId(created.id);
    }
  };

  const exportCsv = (s: Sheet) => {
    const header = s.columns.map((c) => `"${c.name}"`).join(",");
    const lines = s.rows.map((row) =>
      s.columns.map((c) => {
        const v = row[c.id] ?? "";
        if (typeof v === "string" && (v.includes(",") || v.includes('"'))) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return String(v);
      }).join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Sheets"
        description="Smartsheet-style grids — build trackers, registers and lists with custom columns."
        actions={
          <Button size="sm" onClick={() => setNewDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New sheet
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Sheet list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Table2 className="h-4 w-4" /> Sheets ({sheets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {loading ? (
              <p className="text-sm text-muted-foreground p-2">Loading…</p>
            ) : sheets.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No sheets yet</p>
            ) : (
              sheets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full text-left p-2 rounded-md transition-colors ${
                    activeId === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className={`text-xs truncate ${activeId === s.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {s.columns.length} cols · {s.rows.length} rows
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active sheet */}
        <Card className="min-w-0">
          {active ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <button
                        onClick={() => setExpanded(!expanded)}
                        className="hover:bg-muted rounded p-0.5"
                        aria-label="Toggle description"
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {active.name}
                    </CardTitle>
                    {expanded && active.description && (
                      <CardDescription className="mt-1">{active.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setColDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Column
                    </Button>
                    <Button size="sm" variant="outline" onClick={addRow}>
                      <Plus className="h-3 w-3 mr-1" /> Row
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => exportCsv(active)} title="Export CSV">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicateSheet(active)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSheet(active.id)} title="Delete sheet">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      {active.columns.map((c) => (
                        <TableHead key={c.id} className="min-w-[140px]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize font-normal">{c.type}</p>
                            </div>
                            <button
                              onClick={() => deleteColumn(c.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground"
                              title="Delete column"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={active.columns.length + 2} className="text-center text-sm text-muted-foreground py-8">
                          No rows yet — click &quot;Row&quot; to add one
                        </TableCell>
                      </TableRow>
                    ) : (
                      active.rows.map((row, i) => (
                        <TableRow key={i} className="group">
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          {active.columns.map((c) => (
                            <TableCell key={c.id} className="p-1">
                              {renderCellEditor(c, row[c.id] ?? "", (v) => updateCell(i, c.id, v))}
                            </TableCell>
                          ))}
                          <TableCell className="p-1">
                            <button
                              onClick={() => deleteRow(i)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"
                              title="Delete row"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          ) : (
            <CardContent>
              <EmptyState
                title="No sheet selected"
                description="Pick a sheet on the left or create a new one to begin."
                action={<Button size="sm" onClick={() => setNewDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> New sheet</Button>}
              />
            </CardContent>
          )}
        </Card>
      </div>

      {/* New sheet dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a sheet</DialogTitle>
            <DialogDescription>A fresh sheet starts with 3 default columns — add more once created.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Sheet name *</Label>
              <Input value={newSheet.name} onChange={(e) => setNewSheet({ ...newSheet, name: e.target.value })} placeholder="e.g. Onboarding Checklist" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={newSheet.description} onChange={(e) => setNewSheet({ ...newSheet, description: e.target.value })} rows={2} placeholder="What this sheet tracks" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
            <Button onClick={createSheet}>Create sheet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add column dialog */}
      <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add column</DialogTitle>
            <DialogDescription>Choose a column type — text, number, select (dropdown) or date</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Column name *</Label>
              <Input value={newCol.name} onChange={(e) => setNewCol({ ...newCol, name: e.target.value })} placeholder="e.g. Status" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newCol.type} onValueChange={(v) => setNewCol({ ...newCol, type: v as SheetColumn["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {newCol.type === "select" && (
              <div className="space-y-1.5">
                <Label>Options (comma-separated)</Label>
                <Input value={newCol.options} onChange={(e) => setNewCol({ ...newCol, options: e.target.value })} placeholder="Not Started, In Progress, Done" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDialogOpen(false)}>Cancel</Button>
            <Button onClick={addColumn}>Add column</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function renderCellEditor(col: SheetColumn, value: string | number, onChange: (v: string | number) => void) {
  if (col.type === "select") {
    const options = col.options ?? [];
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger className="h-8 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=" ">—</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (col.type === "number") {
    return (
      <Input
        type="number"
        value={value as number}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 border-0 bg-transparent hover:bg-muted focus-visible:ring-1"
      />
    );
  }
  if (col.type === "date") {
    return (
      <Input
        type="date"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 border-0 bg-transparent hover:bg-muted focus-visible:ring-1"
      />
    );
  }
  return (
    <Input
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 border-0 bg-transparent hover:bg-muted focus-visible:ring-1"
    />
  );
}
