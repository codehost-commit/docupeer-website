"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Modal, Select, Spinner, Textarea } from "../_lib/ui";
import { Icon } from "./icons";
import { ASSIGNMENT_TYPES, ASSIGNMENT_TYPE_LABEL, type ClassDTO } from "@/lib/atom/types";

interface Row {
  name: string;
  type: string;
  category: string | null;
  categoryId: string;
  pointsEarned: string;
  pointsPossible: string;
  dueDate: string | null;
  status: string;
}

interface ReportClass {
  name: string;
  teacher: string | null;
  period: string | null;
  schoolYear: string | null;
  term: string | null;
  gradingSystem: "weighted" | "points";
  gpaWeight: "regular" | "honors" | "ap";
  importedGradePercent: string;
  importedGradeLetter: string;
  categories: { name: string; weight: number; dropLowest: number }[];
  rows: Row[];
}

function toRow(r: any): Row {
  return {
    name: r.name ?? "",
    type: r.type ?? "homework",
    category: r.category ?? null,
    categoryId: "",
    pointsEarned: r.pointsEarned != null ? String(r.pointsEarned) : "",
    pointsPossible: r.pointsPossible != null ? String(r.pointsPossible) : "",
    dueDate: r.dueDate ?? null,
    status: r.status ?? "not_started",
  };
}

function toReportClass(c: any): ReportClass {
  return {
    name: c.name ?? "",
    teacher: c.teacher ?? null,
    period: c.period ?? null,
    schoolYear: c.schoolYear ?? null,
    term: c.term ?? null,
    gradingSystem: c.gradingSystem === "weighted" ? "weighted" : "points",
    gpaWeight: c.gpaWeight === "honors" || c.gpaWeight === "ap" ? c.gpaWeight : "regular",
    importedGradePercent: c.importedGradePercent != null ? String(c.importedGradePercent) : "",
    importedGradeLetter: c.importedGradeLetter ?? "",
    categories: Array.isArray(c.categories) ? c.categories : [],
    rows: Array.isArray(c.rows) ? c.rows.map(toRow) : [],
  };
}

function blankRow(): Row {
  return { name: "", type: "homework", category: null, categoryId: "", pointsEarned: "", pointsPossible: "", dueDate: null, status: "not_started" };
}

function blankClass(): ReportClass {
  return { name: "", teacher: null, period: null, schoolYear: null, term: null, gradingSystem: "points", gpaWeight: "regular", importedGradePercent: "", importedGradeLetter: "", categories: [], rows: [] };
}

function saveRows(rows: Row[]) {
  return rows.map((r) => ({
    name: r.name,
    type: r.type,
    category: r.category,
    categoryId: r.categoryId || undefined,
    pointsEarned: r.pointsEarned === "" ? null : Number(r.pointsEarned),
    pointsPossible: r.pointsPossible === "" ? null : Number(r.pointsPossible),
    dueDate: r.dueDate,
    status: r.status,
  }));
}

export function ImportWizard({ classes, defaultClassId, onClose, onSaved }: { classes: ClassDTO[]; defaultClassId?: string | null; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [mode, setMode] = useState<"class" | "report">(classes.length ? "class" : "report");
  const [classId, setClassId] = useState(defaultClassId || classes[0]?.id || "");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [reportClasses, setReportClasses] = useState<ReportClass[]>([]);
  const [source, setSource] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedClass = classes.find((c) => c.id === classId);
  const isReport = reportClasses.length > 0;

  function readFile(next: File) {
    setFile(next);
    if (next.type === "application/pdf" || next.type.startsWith("image/") || /\.(pdf|png|jpe?g|webp)$/i.test(next.name)) {
      setText("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(next);
  }

  async function parse() {
    if (!file && !text.trim()) {
      setError("Paste your grades or upload a CSV, PDF, or image first.");
      return;
    }
    if (mode === "class" && !classId) {
      setError("Choose a class, or switch to Full grade report to create classes automatically.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = file ? await api.importParseFile(file) : await api.importParse({ kind: mode === "report" ? "report" : "text", text });
      const parsedRows = (res.rows || []).map(toRow);
      const parsedClasses = (res.classes || []).map(toReportClass);
      setRows(parsedRows);
      setReportClasses(mode === "report" && parsedClasses.length === 0 && parsedRows.length > 0 ? [{ ...blankClass(), rows: parsedRows }] : parsedClasses);
      setSource(res.source);
      setWarnings(res.warnings || []);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    const validClasses = reportClasses.filter((c) => c.name.trim());
    if (isReport && validClasses.length === 0) {
      setError("Add at least one class name before importing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (isReport) {
        await api.importCommit({
          classes: validClasses.map((c) => ({
            ...c,
            name: c.name.trim(),
            importedGradePercent: c.importedGradePercent === "" ? null : Number(c.importedGradePercent),
            importedGradeLetter: c.importedGradeLetter.trim() || null,
            rows: saveRows(c.rows),
          })),
        });
      } else {
        await api.importCommit({ classId, rows: saveRows(rows) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import.");
      setBusy(false);
    }
  }

  function updateReportClass(index: number, patch: Partial<ReportClass>) {
    setReportClasses((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function updateReportRow(classIndex: number, rowIndex: number, patch: Partial<Row>) {
    setReportClasses((items) => items.map((item, i) => i === classIndex ? { ...item, rows: item.rows.map((row, j) => j === rowIndex ? { ...row, ...patch } : row) } : item));
  }

  function rowTable(items: Row[], update: (index: number, patch: Partial<Row>) => void, remove: (index: number) => void, categoryOptions?: { value: string; label: string }[]) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-deep-dim"><th className="pb-1 pr-2 font-medium">Name</th><th className="pb-1 pr-2 font-medium">Type</th>{categoryOptions && categoryOptions.length > 1 && <th className="pb-1 pr-2 font-medium">Category</th>}<th className="pb-1 pr-2 font-medium">Earned</th><th className="pb-1 pr-2 font-medium">Out of</th><th /></tr></thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={i} className="border-t border-deep-border">
                <td className="py-1 pr-2"><Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="min-w-[140px] px-2 py-1" /></td>
                <td className="py-1 pr-2"><Select value={r.type} onChange={(v) => update(i, { type: v })} options={ASSIGNMENT_TYPES.map((t) => ({ value: t, label: ASSIGNMENT_TYPE_LABEL[t] }))} className="px-2 py-1" /></td>
                {categoryOptions && categoryOptions.length > 1 && <td className="py-1 pr-2"><Select value={r.categoryId} onChange={(v) => update(i, { categoryId: v })} options={categoryOptions} className="px-2 py-1" /></td>}
                <td className="py-1 pr-2"><Input value={r.pointsEarned} onChange={(e) => update(i, { pointsEarned: e.target.value })} className="w-16 px-2 py-1" /></td>
                <td className="py-1 pr-2"><Input value={r.pointsPossible} onChange={(e) => update(i, { pointsPossible: e.target.value })} className="w-16 px-2 py-1" /></td>
                <td className="py-1"><button onClick={() => remove(i)} className="rounded p-1 text-deep-dim hover:bg-deep-panel2"><Icon name="trash" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Modal
      title="Import grades"
      onClose={onClose}
      size="lg"
      footer={step === "input" ? <><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={parse} disabled={busy || (mode === "class" && !classId)}>{busy ? <Spinner className="h-4 w-4" /> : "Detect grades"}</Btn></> : <><Btn variant="ghost" onClick={() => setStep("input")}>Back</Btn><Btn onClick={commit} disabled={busy || (!isReport && rows.length === 0)}>{busy ? <Spinner className="h-4 w-4" /> : isReport ? `Import ${reportClasses.length} class${reportClasses.length === 1 ? "" : "es"}` : `Import ${rows.length} item${rows.length === 1 ? "" : "s"}`}</Btn></>}
    >
      {step === "input" ? (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl bg-deep-panel2 p-1">
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "class" ? "bg-deep-panel font-medium text-deep-text shadow-sm" : "text-deep-dim"}`} onClick={() => setMode("class")} disabled={!classes.length}>One class</button>
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "report" ? "bg-deep-panel font-medium text-deep-text shadow-sm" : "text-deep-dim"}`} onClick={() => setMode("report")}>Full grade report</button>
          </div>
          {mode === "class" ? <Field label="Import into class"><Select value={classId} onChange={setClassId} options={classes.map((c) => ({ value: c.id, label: c.name }))} /></Field> : <div className="rounded-xl bg-deep-accent-soft px-3 py-2 text-sm text-deep-accent">Atom will find the courses in the report and let you review, rename, remove, or add classes before saving.</div>}
          <Field label="Paste grades, or upload a CSV, PDF, or image" hint="PDF grade reports and screenshots are read by Groq AI. Nothing is saved until you review the detected classes and rows.">
            <Textarea value={text} onChange={(e) => { setText(e.target.value); setFile(null); }} placeholder={mode === "report" ? "Paste a grade report, or upload a PDF/photo..." : "Assignment, Score, Out of, Due\nLab 3, 18, 20, 2026-10-02\nUnit 2 Test, 88, 100, 2026-10-09"} className="min-h-[160px] font-mono text-xs" />
          </Field>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-deep-accent"><Icon name="upload" size={16} /> {file ? file.name : "Upload CSV, PDF, or image"}<input type="file" accept=".csv,.tsv,.txt,.pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} /></label>
          {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs"><span className="text-deep-dim">{source === "groq" ? "Standardized by AI" : "Basic parser"} · Review everything before saving.</span>{!isReport && <Btn size="sm" variant="ghost" onClick={() => setRows([...rows, blankRow()])}><Icon name="plus" size={13} /> Row</Btn>}</div>
          {warnings.map((w, i) => <div key={i} className="flex items-start gap-2 rounded-lg bg-deep-warn/10 px-3 py-2 text-xs text-deep-warn"><Icon name="warn" size={14} /> {w}</div>)}
          {isReport ? (
            <div className="space-y-3">
              {reportClasses.map((c, classIndex) => (
                <div key={classIndex} className="rounded-xl border border-deep-border bg-deep-bg p-3">
                  <div className="mb-3 flex items-start gap-2"><div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_90px]"><Input value={c.name} onChange={(e) => updateReportClass(classIndex, { name: e.target.value })} placeholder="Class name" /><Input value={c.importedGradePercent} onChange={(e) => updateReportClass(classIndex, { importedGradePercent: e.target.value })} placeholder="Grade %" type="number" min="0" max="100" /><Input value={c.importedGradeLetter} onChange={(e) => updateReportClass(classIndex, { importedGradeLetter: e.target.value.toUpperCase() })} placeholder="Letter" /></div><button onClick={() => setReportClasses(reportClasses.filter((_, i) => i !== classIndex))} className="rounded p-2 text-deep-dim hover:bg-deep-panel2 hover:text-deep-bad"><Icon name="trash" size={15} /></button></div>
                  <div className="mb-2 text-xs text-deep-dim">{c.rows.length ? `${c.rows.length} assignment${c.rows.length === 1 ? "" : "s"} detected` : "No individual assignments detected - the overall grade will be saved."}</div>
                  {c.rows.length > 0 && rowTable(c.rows, (i, patch) => updateReportRow(classIndex, i, patch), (i) => updateReportClass(classIndex, { rows: c.rows.filter((_, j) => j !== i) }))}
                  <Btn size="sm" variant="ghost" onClick={() => updateReportClass(classIndex, { rows: [...c.rows, blankRow()] })}><Icon name="plus" size={13} /> Assignment</Btn>
                </div>
              ))}
              <Btn size="sm" variant="outline" onClick={() => setReportClasses([...reportClasses, blankClass()])}><Icon name="plus" size={13} /> Add class</Btn>
            </div>
          ) : (
            <>{rows.length > 0 ? rowTable(rows, (i, patch) => setRows(rows.map((r, j) => j === i ? { ...r, ...patch } : r)), (i) => setRows(rows.filter((_, j) => j !== i)), selectedClass?.categories.length ? [{ value: "", label: "-" }, ...selectedClass.categories.map((c) => ({ value: c.id, label: c.name }))] : undefined) : <div className="py-4 text-center text-sm text-deep-dim">Nothing detected. Go back and check your input.</div>}</>
          )}
          {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
        </div>
      )}
    </Modal>
  );
}
