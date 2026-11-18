"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { parseCsv, toCsv } from "@/lib/csv";

export interface BulkColumn {
  /** key on the row object sent to the API */
  key: string;
  /** header label shown in the CSV template + preview table */
  label: string;
  required?: boolean;
  /** value used in the template example row and when the CSV cell is blank */
  default?: string | number;
}

interface BulkResult {
  created: number;
  errors: { row: number; msg: string }[];
  total?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  endpoint: string;
  columns: BulkColumn[];
  /** called after a successful import so the parent can refresh its list */
  onDone: () => void;
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  title,
  description,
  endpoint,
  columns,
  onDone,
}: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setRowErrors({});
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const header = columns.map((c) => c.label);
    const example = columns.map((c) => c.default ?? "");
    const csv = toCsv([header, example]);
    const blob = new Blob([csv + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    setResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("CSV needs a header row and at least one data row");
      setRows([]);
      setRowErrors({});
      return;
    }

    const [headerRow, ...dataRows] = parsed;
    const labelToCol = new Map(
      columns.map((c) => [c.label.toLowerCase().trim(), c]),
    );
    const keyOrder: BulkColumn[] = [];
    for (const h of headerRow) {
      const col = labelToCol.get(h.toLowerCase().trim());
      if (col) keyOrder.push(col);
    }
    if (keyOrder.length === 0) {
      toast.error("No recognized columns. Download the template for the right headers.");
      setRows([]);
      setRowErrors({});
      return;
    }

    const objs: Record<string, string>[] = [];
    const errs: Record<number, string[]> = {};
    dataRows
      .filter((r) => r.some((c) => c.trim() !== ""))
      .forEach((r, displayIdx) => {
        const o: Record<string, string> = {};
        keyOrder.forEach((col, i) => {
          const v = (r[i] ?? "").trim();
          o[col.key] = v;
        });
        // apply defaults for blank cells
        for (const col of columns) {
          if ((!o[col.key] || o[col.key] === "") && col.default != null) {
            o[col.key] = String(col.default);
          }
        }
        // validate required
        const rowErrs: string[] = [];
        for (const col of columns) {
          if (col.required && !o[col.key]) {
            rowErrs.push(`${col.label} is required`);
          }
        }
        if (rowErrs.length) errs[displayIdx] = rowErrs;
        objs.push(o);
      });

    setRows(objs);
    setRowErrors(errs);
    if (objs.length === 0) toast.error("No data rows found in the file");
    else toast.success(`Parsed ${objs.length} rows`);
  };

  const errorCount = Object.keys(rowErrors).length;
  const canImport = rows.length > 0 && errorCount === 0 && !importing;

  const runImport = async () => {
    setImporting(true);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      setResult(data as BulkResult);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} record${data.created === 1 ? "" : "s"}`);
        onDone();
      } else {
        toast.error("No records imported — check the errors below");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>
            {description ??
              "Upload a CSV to create many records at once. Download the template for the correct column headers."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Download template
          </Button>
          <Input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="max-w-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          {rows.length > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">
              {rows.length} row{rows.length === 1 ? "" : "s"} parsed
              {errorCount > 0 && (
                <span className="text-rose-600 dark:text-rose-400">
                  {" "}· {errorCount} with errors
                </span>
              )}
            </span>
          )}
        </div>

        {rows.length > 0 && (
          <div className="border rounded-md max-h-[40vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  {columns.map((c) => (
                    <TableHead key={c.key}>
                      {c.label}
                      {c.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const errs = rowErrors[i];
                  return (
                    <TableRow
                      key={i}
                      className={errs ? "bg-rose-50 dark:bg-rose-950/30" : ""}
                    >
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      {columns.map((c) => (
                        <TableCell key={c.key} className="text-xs whitespace-nowrap">
                          {r[c.key] || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {result && (
          <div className="rounded-md border p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              {result.created > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              Created {result.created} record{result.created === 1 ? "" : "s"}
              {result.errors.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}· {result.errors.length} skipped
                </span>
              )}
            </div>
            {result.errors.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-auto">
                {result.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.msg}
                  </li>
                ))}
                {result.errors.length > 50 && (
                  <li>…and {result.errors.length - 50} more</li>
                )}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={runImport} disabled={!canImport}>
              <Upload className="h-4 w-4 mr-1" />
              {importing
                ? "Importing…"
                : `Import ${rows.length - errorCount} record${rows.length - errorCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
