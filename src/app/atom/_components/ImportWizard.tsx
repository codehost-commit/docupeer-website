"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Modal, Select, Spinner, Textarea, cx } from "../_lib/ui";
import { Icon } from "./icons";
import { ASSIGNMENT_TYPES, ASSIGNMENT_TYPE_LABEL, WORK_STATUSES, type ClassDTO } from "@/lib/atom/types";

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

export function ImportWizard({ classes, defaultClassId, onClose, onSaved }: { classes: ClassDTO[]; defaultClassId?: string | null; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [classId, setClassId] = useState(defaultClassId || classes[0]?.id || "");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedClass = classes.find((c) => c.id === classId);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(file);
  }

  async function parse() {
    if (!text.trim()) {
      setError("Paste your grades or upload a CSV first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.importParse({ kind: "text", text });
      setRows(
        (res.rows || []).map((r: any) => ({
          name: r.name ?? "",
          type: r.type ?? "homework",
          category: r.category ?? null,
          categoryId: "",
          pointsEarned: r.pointsEarned != null ? String(r.pointsEarned) : "",
          pointsPossible: r.pointsPossible != null ? String(r.pointsPossible) : "",
          dueDate: r.dueDate ?? null,
          status: r.status ?? "not_started",
        })),
      );
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
    setBusy(true);
    setError("");
    try {
      await api.importCommit({
        classId,
        rows: rows.map((r) => ({
          name: r.name,
          type: r.type,
          category: r.category,
          categoryId: r.categoryId || undefined,
          pointsEarned: r.pointsEarned === "" ? null : Number(r.pointsEarned),
          pointsPossible: r.pointsPossible === "" ? null : Number(r.pointsPossible),
          dueDate: r.dueDate,
          status: r.status,
        })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Import grades"
      onClose={onClose}
      size="lg"
      footer={
        step === "input" ? (
          <>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={parse} disabled={busy || !classId}>{busy ? <Spinner className="h-4 w-4" /> : "Detect grades"}</Btn>
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => setStep("input")}>Back</Btn>
            <Btn onClick={commit} disabled={busy || rows.length === 0}>{busy ? <Spinner className="h-4 w-4" /> : `Import ${rows.length} item${rows.length === 1 ? "" : "s"}`}</Btn>
          </>
        )
      }
    >
      {step === "input" ? (
        <div className="space-y-3">
          <Field label="Import into class">
            <Select value={classId} onChange={setClassId} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Paste grades, or upload a CSV" hint="Anything works — a copy/paste from your gradebook, a CSV, or a screenshot's text. AI standardizes the format; you review everything before it saves.">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Assignment, Score, Out of, Due\nLab 3, 18, 20, 2026-10-02\nUnit 2 Test, 88, 100, 2026-10-09"} className="min-h-[160px] font-mono text-xs" />
          </Field>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-deep-accent">
            <Icon name="upload" size={16} /> Upload CSV file
            <input type="file" accept=".csv,text/csv,.tsv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </label>
          {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-deep-dim">
              {source === "groq" ? "Standardized by AI" : "Basic parser"} · Review and fix anything before saving.
            </span>
            <Btn size="sm" variant="ghost" onClick={() => setRows([...rows, { name: "", type: "homework", category: null, categoryId: "", pointsEarned: "", pointsPossible: "", dueDate: null, status: "not_started" }])}>
              <Icon name="plus" size={13} /> Row
            </Btn>
          </div>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-deep-warn/10 px-3 py-2 text-xs text-deep-warn">
              <Icon name="warn" size={14} /> {w}
            </div>
          ))}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-deep-dim">
                  <th className="pb-1 pr-2 font-medium">Name</th>
                  <th className="pb-1 pr-2 font-medium">Type</th>
                  {selectedClass && selectedClass.categories.length > 0 && <th className="pb-1 pr-2 font-medium">Category</th>}
                  <th className="pb-1 pr-2 font-medium">Earned</th>
                  <th className="pb-1 pr-2 font-medium">Out of</th>
                  <th className="pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-deep-border">
                    <td className="py-1 pr-2"><Input value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="min-w-[140px] px-2 py-1" /></td>
                    <td className="py-1 pr-2"><Select value={r.type} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, type: v } : x)))} options={ASSIGNMENT_TYPES.map((t) => ({ value: t, label: ASSIGNMENT_TYPE_LABEL[t] }))} className="px-2 py-1" /></td>
                    {selectedClass && selectedClass.categories.length > 0 && (
                      <td className="py-1 pr-2"><Select value={r.categoryId} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, categoryId: v } : x)))} options={[{ value: "", label: "—" }, ...selectedClass.categories.map((c) => ({ value: c.id, label: c.name }))]} className="px-2 py-1" /></td>
                    )}
                    <td className="py-1 pr-2"><Input value={r.pointsEarned} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, pointsEarned: e.target.value } : x)))} className="w-16 px-2 py-1" /></td>
                    <td className="py-1 pr-2"><Input value={r.pointsPossible} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, pointsPossible: e.target.value } : x)))} className="w-16 px-2 py-1" /></td>
                    <td className="py-1"><button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded p-1 text-deep-dim hover:bg-deep-panel2"><Icon name="trash" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <div className="py-4 text-center text-sm text-deep-dim">Nothing detected. Go back and check your input.</div>}
          {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
        </div>
      )}
    </Modal>
  );
}
