"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Modal, Select, Spinner, Toggle, cx } from "../_lib/ui";
import { Icon } from "./icons";
import type { ClassDTO, GpaWeight, GradingSystem } from "@/lib/atom/types";

const COLORS = ["#356d97", "#7c5cbf", "#4f8a5f", "#a87717", "#b3455e", "#2f6288", "#557755", "#8a5a44"];

interface CatRow {
  name: string;
  weight: string;
  dropLowest: string;
}

export function ClassForm({ existing, onClose, onSaved }: { existing?: ClassDTO; onClose: () => void; onSaved: () => void }) {
  const editing = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [teacher, setTeacher] = useState(existing?.teacher ?? "");
  const [period, setPeriod] = useState(existing?.period ?? "");
  const [schoolYear, setSchoolYear] = useState(existing?.schoolYear ?? "");
  const [term, setTerm] = useState(existing?.term ?? "");
  const [credits, setCredits] = useState(String(existing?.credits ?? 1));
  const [grading, setGrading] = useState<GradingSystem>(existing?.gradingSystem ?? "weighted");
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [gpaWeight, setGpaWeight] = useState<GpaWeight>(existing?.gpaWeight ?? "regular");
  const [includeInGpa, setIncludeInGpa] = useState(existing?.includeInGpa ?? true);
  const [cats, setCats] = useState<CatRow[]>(
    editing
      ? []
      : [
          { name: "Tests", weight: "50", dropLowest: "0" },
          { name: "Homework", weight: "25", dropLowest: "0" },
          { name: "Quizzes", weight: "15", dropLowest: "0" },
          { name: "Projects", weight: "10", dropLowest: "0" },
        ],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const weightSum = cats.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  async function save() {
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }
    setBusy(true);
    setError("");
    const payload: Record<string, unknown> = {
      name: name.trim(),
      teacher: teacher.trim() || null,
      period: period.trim() || null,
      schoolYear: schoolYear.trim() || null,
      term: term.trim() || null,
      credits: Number(credits) || 1,
      gradingSystem: grading,
      color,
      gpaWeight,
      includeInGpa,
    };
    try {
      if (editing) {
        await api.updateClass(existing!.id, payload);
      } else {
        payload.categories =
          grading === "weighted"
            ? cats.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), weight: Number(c.weight) || 0, dropLowest: Number(c.dropLowest) || 0 }))
            : [];
        await api.createClass(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit class" : "Add a class"}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : editing ? "Save class" : "Add class"}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Class name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chemistry" /></Field>
          <Field label="Teacher"><Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Dr. Smith" /></Field>
          <Field label="Period"><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Period 3" /></Field>
          <Field label="School year"><Input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2026-27" /></Field>
          <Field label="Term">
            <Select value={term} onChange={setTerm} options={[
              { value: "", label: "Full year" }, { value: "S1", label: "Semester 1" }, { value: "S2", label: "Semester 2" },
              { value: "Q1", label: "Quarter 1" }, { value: "Q2", label: "Quarter 2" }, { value: "Q3", label: "Quarter 3" }, { value: "Q4", label: "Quarter 4" },
            ]} />
          </Field>
          <Field label="Credits"><Input type="number" step="0.5" value={credits} onChange={(e) => setCredits(e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Grading system">
            <Select value={grading} onChange={(v) => setGrading(v as GradingSystem)} options={[
              { value: "weighted", label: "Weighted categories" }, { value: "points", label: "Total points" },
            ]} />
          </Field>
          <Field label="GPA weighting">
            <Select value={gpaWeight} onChange={(v) => setGpaWeight(v as GpaWeight)} options={[
              { value: "regular", label: "Regular" }, { value: "honors", label: "Honors (+0.5)" }, { value: "ap", label: "AP / IB (+1.0)" },
            ]} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Field label="Color">
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={cx("h-7 w-7 rounded-full border-2", color === c ? "border-deep-text" : "border-transparent")} style={{ background: c }} />
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 pt-4">
            <Toggle checked={includeInGpa} onChange={setIncludeInGpa} />
            <span className="text-sm text-deep-text-soft">Include in GPA</span>
          </label>
        </div>

        {!editing && grading === "weighted" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-deep-dim">Category weights</div>
              <div className={cx("text-xs", Math.abs(weightSum - 100) < 0.01 ? "text-deep-good" : "text-deep-warn")}>Total: {weightSum}%</div>
            </div>
            <div className="space-y-2">
              {cats.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={c.name} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Category" className="flex-1" />
                  <Input type="number" value={c.weight} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} className="w-20" placeholder="%" />
                  <button onClick={() => setCats(cats.filter((_, j) => j !== i))} className="rounded-lg p-2 text-deep-dim hover:bg-deep-panel2"><Icon name="trash" size={16} /></button>
                </div>
              ))}
              <Btn variant="ghost" size="sm" onClick={() => setCats([...cats, { name: "", weight: "0", dropLowest: "0" }])}><Icon name="plus" size={14} /> Add category</Btn>
            </div>
          </div>
        )}
        {editing && <p className="text-xs text-deep-dim">Manage category weights from the class&apos;s Setup tab.</p>}
        {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
      </div>
    </Modal>
  );
}
