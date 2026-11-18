"use client";

// Company Forms — official company documents (fill in digitally, export as PDF).
// Templates live in src/lib/forms.ts and mirror the original paper forms doc-for-doc.

import { useEffect, useState, useCallback, useMemo } from "react";
import { SectionHeader, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileStack,
  Plus,
  Pencil,
  Trash2,
  Download,
  FileText,
  AlertTriangle,
  Car,
  MessageSquareWarning,
  BellRing,
  CalendarDays,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FORM_TEMPLATES,
  getTemplate,
  submissionTitle,
  suggestDocId,
  FormData as FormValues,
  FormField,
  FormTemplate,
} from "@/lib/forms";

interface Submission {
  id: string;
  template: string;
  data: FormValues;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "incident-report": AlertTriangle,
  "accident-report": Car,
  "customer-complaint": MessageSquareWarning,
  "customer-notification": BellRing,
  "leave-application": CalendarDays,
};

const TEMPLATE_NOTES: Record<string, string> = {
  "incident-report": "Damage or incident involving a customer or property — MANAGEMENT SYSTEM",
  "accident-report": "Company vehicle accident report for insurance — MANAGEMENT SYSTEM",
  "customer-complaint": "Client complaint intake & resolution record — MANAGEMENT SYSTEM",
  "customer-notification": "Formal notification to a client — MANAGEMENT SYSTEM",
  "leave-application": "Multi-type leave application with payments — MANAGEMENT SYSTEM",
};

export function FormsView() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<{ template: FormTemplate; existing?: Submission } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);

  const load = useCallback(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((rows: Submission[]) => setSubs(Array.isArray(rows) ? rows : []))
      .catch(() => toast.error("Failed to load forms"))
      .finally(() => Promise.resolve().then(() => setLoading(false)));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => setLoading(true));
    load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? subs : subs.filter((s) => s.template === filter)),
    [subs, filter]
  );

  const countByTemplate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of subs) map[s.template] = (map[s.template] ?? 0) + 1;
    return map;
  }, [subs]);

  const suggestIds = useCallback(
    (template: FormTemplate): FormValues => {
      const initial: FormValues = {};
      if (template.idFieldKey && template.idPrefix) {
        const existing = subs
          .filter((s) => s.template === template.id)
          .map((s) => (typeof s.data[template.idFieldKey!] === "string" ? (s.data[template.idFieldKey!] as string) : ""))
          .filter(Boolean);
        initial[template.idFieldKey] = suggestDocId(template.idPrefix, existing);
      }
      return initial;
    },
    [subs]
  );

  const handleDownload = useCallback(async (sub: Submission) => {
    try {
      toast.loading("Generating PDF…", { id: `pdf-${sub.id}` });
      const res = await fetch(`/api/forms/${sub.id}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getTemplate(sub.template)?.docId ?? "form"}_${sub.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded — ready to send to the client or employee", { id: `pdf-${sub.id}` });
    } catch {
      toast.error("PDF download failed", { id: `pdf-${sub.id}` });
    }
  }, []);

  const handleDelete = useCallback(
    async (sub: Submission) => {
      try {
        const res = await fetch(`/api/forms/${sub.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setSubs((prev) => prev.filter((s) => s.id !== sub.id));
        toast.success("Form deleted");
      } catch {
        toast.error("Delete failed");
      }
    },
    []
  );

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Company Forms"
        description="Official company documents — fill them in digitally and download a PDF to send to a client or employee."
        actions={
          <Button onClick={() => setPickerOpen(true)} className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> New form
          </Button>
        }
      />

      {/* Template quick-start cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {FORM_TEMPLATES.map((t) => {
          const Icon = TEMPLATE_ICONS[t.id] ?? FileStack;
          return (
            <button
              key={t.id}
              onClick={() => setEditing({ template: t })}
              className="text-left card-hover bg-card border rounded-2xl p-4 flex flex-col gap-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <Badge variant="outline" className="text-[9px] font-mono">
                  {t.docId}
                </Badge>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight truncate">{t.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{TEMPLATE_NOTES[t.id]}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-primary mt-auto">
                <Plus className="h-3 w-3" />
                Fill in
                <span className="text-muted-foreground font-medium">· {countByTemplate[t.id] ?? 0} on file</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {["all", ...FORM_TEMPLATES.map((t) => t.id)].map((id) => {
          const t = getTemplate(id);
          const active = filter === id;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:text-foreground border-border"
              )}
            >
              {id === "all" ? `All (${subs.length})` : `${t?.title} (${countByTemplate[id] ?? 0})`}
            </button>
          );
        })}
      </div>

      {/* Submission list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading forms…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10">
              <EmptyState
                title="No forms yet"
                description="Pick a form above, fill it in and download it as a PDF."
              />
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((sub) => {
                const t = getTemplate(sub.template);
                const Icon = TEMPLATE_ICONS[sub.template] ?? FileStack;
                const title = t ? submissionTitle(sub.template, sub.data) : "Form";
                return (
                  <li key={sub.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold truncate">{title}</p>
                        <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                          {t?.docId}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t?.title} · {t?.company} · updated{" "}
                        {new Date(sub.updatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="rounded-full gap-1.5 h-8" onClick={() => t && setEditing({ template: t, existing: sub })}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" className="rounded-full gap-1.5 h-8 bg-primary" onClick={() => handleDownload(sub)}>
                        <Download className="h-3.5 w-3.5" /> PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(sub)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Template picker — same as quick cards, kept for the "New form" button */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5 text-primary" /> Choose a form to fill in
            </DialogTitle>
            <DialogDescription>
              All five official company documents. Pick one — you can download it as a PDF once filled.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2">
            {FORM_TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.id] ?? FileStack;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setPickerOpen(false);
                    setEditing({ template: t });
                  }}
                  className="text-left border rounded-xl p-3.5 hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{t.title}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{t.docId}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fill-in dialog */}
      {editing && (
        <FillFormDialog
          template={editing.template}
          existing={editing.existing}
          suggested={suggestIds(editing.template)}
          onClose={() => setEditing(null)}
          onSaved={(sub) => {
            setSubs((prev) => {
              const idx = prev.findIndex((s) => s.id === sub.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = sub;
                return copy;
              }
              return [sub, ...prev];
            });
          }}
          onDownload={handleDownload}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `"${getTemplate(deleteTarget.template)?.title ?? "Form"}${deleteTarget.data && getTemplate(deleteTarget.template)?.summaryKey && deleteTarget.data[getTemplate(deleteTarget.template)!.summaryKey] ? " — " + deleteTarget.data[getTemplate(deleteTarget.template)!.summaryKey] : ""}" will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Fill-in dialog — dynamic fields from the template definition
// ============================================================

function FillFormDialog({
  template,
  existing,
  suggested,
  onClose,
  onSaved,
  onDownload,
}: {
  template: FormTemplate;
  existing?: Submission;
  suggested: FormValues;
  onClose: () => void;
  onSaved: (sub: Submission) => void;
  onDownload: (sub: Submission) => void;
}) {
  const [values, setValues] = useState<FormValues>(existing ? { ...existing.data } : { ...suggested });
  const [saving, setSaving] = useState(false);

  const set = (key: string, v: FormValues[string]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const missing = useMemo(() => {
    const req: string[] = [];
    for (const s of template.sections) {
      for (const f of s.fields) {
        if (f.required) {
          const v = values[f.key];
          if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) req.push(f.label);
        }
      }
    }
    return req;
  }, [template, values]);

  const save = async (thenDownload: boolean) => {
    if (missing.length > 0) {
      toast.error(`Required fields missing: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` +${missing.length - 3} more` : ""}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(existing ? `/api/forms/${existing.id}` : "/api/forms", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing ? { data: values } : { template: template.id, data: values }),
      });
      if (!res.ok) throw new Error();
      const sub = (await res.json()) as Submission;
      onSaved(sub);
      toast.success(existing ? "Form updated" : "Form saved");
      onClose();
      if (thenDownload) onDownload(sub);
    } catch {
      toast.error("Save failed");
    } finally {
      Promise.resolve().then(() => setSaving(false));
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span>{template.title}</span>
            <Badge variant="outline" className="text-[9px] font-mono">
              {template.docId}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {template.company} — fill in the details below; blank fields stay empty on the PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {template.sections.map((section, si) => (
            <div key={si} className="space-y-3">
              {section.heading && (
                <div className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-bold tracking-wide">
                  {section.heading}
                </div>
              )}
              {section.note && <p className="text-[11px] italic text-muted-foreground">{section.note}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    onChange={(v) => set(f.key, v)}
                    className={f.half ? "" : "sm:col-span-2"}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Signature names */}
          {template.signBlocks.length > 0 && (
            <div className="space-y-3">
              <div className="bg-muted text-foreground rounded-md px-3 py-1.5 text-xs font-bold tracking-wide">
                SIGNATURES
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {template.signBlocks.flatMap((b, bi) => {
                  const nodes: React.ReactNode[] = [];
                  if (b.leftNameKey) {
                    nodes.push(
                      <FieldInput
                        key={`sl-${bi}`}
                        field={{ key: b.leftNameKey, label: `${b.leftLabel} — name (printed under line)`, type: "text" }}
                        value={values[b.leftNameKey]}
                        onChange={(v) => set(b.leftNameKey!, v)}
                        className=""
                      />
                    );
                  }
                  if (b.rightNameKey) {
                    nodes.push(
                      <FieldInput
                        key={`sr-${bi}`}
                        field={{ key: b.rightNameKey, label: `${b.rightLabel} — name (printed under line)`, type: "text" }}
                        value={values[b.rightNameKey]}
                        onChange={(v) => set(b.rightNameKey!, v)}
                        className=""
                      />
                    );
                  }
                  return nodes;
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Signature lines are printed on the PDF for physical signing. Names entered here appear beneath the lines.
              </p>
            </div>
          )}

          {template.footerFields?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {template.footerFields.map((ff) => (
                <FieldInput
                  key={ff.key}
                  field={{ key: ff.key, label: ff.label, type: "text" }}
                  value={values[ff.key]}
                  onChange={(v) => set(ff.key, v)}
                  className=""
                />
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={saving || missing.length > 0}
            onClick={() => save(true)}
          >
            <Send className="h-4 w-4" /> Save &amp; download PDF
          </Button>
          <Button onClick={() => save(false)} disabled={saving || missing.length > 0} className="gap-2 bg-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {existing ? "Save changes" : "Save form"}
          </Button>
        </DialogFooter>
        {missing.length > 0 && (
          <p className="text-[11px] text-destructive -mt-1">
            Required: {missing.join(" · ")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- dynamic field renderer ----------

function FieldInput({
  field,
  value,
  onChange,
  className,
}: {
  field: FormField;
  value: FormValues[string] | undefined;
  onChange: (v: FormValues[string] | undefined) => void;
  className?: string;
}) {
  if (field.type === "textarea") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label className="text-xs font-semibold">
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={field.placeholder}
          className="min-h-20"
        />
      </div>
    );
  }

  if (field.type === "yesno") {
    const v = typeof value === "string" ? value : "";
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label className="text-xs font-semibold">
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        <div className="flex items-center gap-2">
          {(["yes", "no"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(v === opt ? undefined : opt)}
              className={cn(
                "h-8 px-4 rounded-full text-xs font-bold border transition-colors",
                v === opt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "checkbox-group") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label className="text-xs font-semibold">
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        <div className="flex flex-wrap gap-2 pt-1">
          {(field.checkboxOptions ?? []).map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors",
                selected.includes(opt) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
              )}
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(c) => {
                  const next = c ? [...selected, opt] : selected.filter((x) => x !== opt);
                  onChange(next.length ? next : undefined);
                }}
                className={selected.includes(opt) ? "border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary" : ""}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text";
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold">
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        type={inputType}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={field.autoId ? field.placeholder ?? "auto" : field.placeholder}
      />
    </div>
  );
}
