"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Modal, Select, Spinner, Textarea, Toggle } from "../_lib/ui";
import { combineDateTime, toDateInputValue, toTimeInputValue } from "../_lib/datetime";
import {
  ASSIGNMENT_TYPES,
  ASSIGNMENT_TYPE_LABEL,
  WORK_STATUSES,
  WORK_STATUS_LABEL,
  type AssignmentDTO,
  type AssignmentType,
  type ClassDTO,
  type WorkStatus,
} from "@/lib/atom/types";

export function AssignmentForm({
  existing,
  defaultClassId,
  classes,
  onClose,
  onSaved,
}: {
  existing?: AssignmentDTO;
  defaultClassId?: string | null;
  classes: ClassDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [classId, setClassId] = useState(existing?.classId ?? defaultClassId ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "");
  const [type, setType] = useState<AssignmentType>(existing?.type ?? "homework");
  const [status, setStatus] = useState<WorkStatus>(existing?.status ?? "not_started");
  const [date, setDate] = useState(toDateInputValue(existing?.dueAt ?? null));
  const [hasTime, setHasTime] = useState(existing?.hasTime ?? false);
  const [time, setTime] = useState(toTimeInputValue(existing?.dueAt ?? null));
  const [earned, setEarned] = useState(existing?.pointsEarned != null ? String(existing.pointsEarned) : "");
  const [possible, setPossible] = useState(existing?.pointsPossible != null ? String(existing.pointsPossible) : "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedClass = classes.find((c) => c.id === classId);

  async function save() {
    if (!name.trim()) {
      setError("Assignment name is required.");
      return;
    }
    setBusy(true);
    setError("");
    const payload: Record<string, unknown> = {
      name: name.trim(),
      classId: classId || null,
      categoryId: categoryId || null,
      type,
      status,
      dueAt: date ? combineDateTime(date, hasTime ? time : null) : null,
      hasTime: !!(date && hasTime),
      pointsEarned: earned === "" ? null : Number(earned),
      pointsPossible: possible === "" ? null : Number(possible),
      description: description.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (editing) await api.updateAssignment(existing!.id, payload);
      else await api.createAssignment(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit assignment" : "New assignment"}
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : "Save"}</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chapter 5 problem set" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Class">
            <Select value={classId} onChange={(v) => { setClassId(v); setCategoryId(""); }} options={[{ value: "", label: "No class" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(v) => setType(v as AssignmentType)} options={ASSIGNMENT_TYPES.map((t) => ({ value: t, label: ASSIGNMENT_TYPE_LABEL[t] }))} />
          </Field>
        </div>
        {selectedClass && selectedClass.gradingSystem === "weighted" && selectedClass.categories.length > 0 && (
          <Field label="Category">
            <Select value={categoryId} onChange={setCategoryId} options={[{ value: "", label: "Uncategorized" }, ...selectedClass.categories.map((c) => ({ value: c.id, label: `${c.name} (${c.weight}%)` }))]} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onChange={(v) => setStatus(v as WorkStatus)} options={WORK_STATUSES.map((s) => ({ value: s, label: WORK_STATUS_LABEL[s] }))} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={hasTime} onChange={setHasTime} label="Specific time" />
          {hasTime && <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Points earned"><Input type="number" step="0.01" value={earned} onChange={(e) => setEarned(e.target.value)} placeholder="—" /></Field>
          <Field label="Points possible"><Input type="number" step="0.01" value={possible} onChange={(e) => setPossible(e.target.value)} placeholder="—" /></Field>
        </div>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></Field>
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
        {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
      </div>
    </Modal>
  );
}
