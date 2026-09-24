"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Modal, Select, Spinner, Textarea, Toggle } from "../_lib/ui";
import { combineDateTime, toDateInputValue, toTimeInputValue } from "../_lib/datetime";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  TASK_CATEGORIES,
  TASK_STATUSES,
  type ClassDTO,
  type Priority,
  type TaskCategory,
  type TaskDTO,
  type TaskStatus,
} from "@/lib/atom/types";

const STATUS_LABEL: Record<TaskStatus, string> = { not_started: "Not started", in_progress: "In progress", completed: "Completed" };
const CAT_LABEL: Record<TaskCategory, string> = { academic: "Academic", ec: "Extracurricular", personal: "Personal" };

export function TaskForm({ existing, classes, onClose, onSaved }: { existing?: TaskDTO; classes: ClassDTO[]; onClose: () => void; onSaved: () => void }) {
  const editing = !!existing;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<TaskCategory>(existing?.category ?? "academic");
  const [classId, setClassId] = useState(existing?.classId ?? "");
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? "not_started");
  const [date, setDate] = useState(toDateInputValue(existing?.dueAt ?? null));
  const [hasTime, setHasTime] = useState(existing?.hasTime ?? false);
  const [time, setTime] = useState(toTimeInputValue(existing?.dueAt ?? null) || "17:00");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    setBusy(true);
    setError("");
    const payload: Record<string, unknown> = {
      title: title.trim(),
      category,
      classId: classId || null,
      priority,
      status,
      dueAt: date ? combineDateTime(date, hasTime ? time : null) : null,
      hasTime: !!(date && hasTime),
      description: description.trim() || null,
    };
    try {
      if (editing) await api.updateTask(existing!.id, payload);
      else await api.createTask(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit task" : "New task"}
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : "Save"}</Btn></>}
    >
      <div className="space-y-3">
        <Field label="Task"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Email Ms. Lee about recommendation" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={category} onChange={(v) => setCategory(v as TaskCategory)} options={TASK_CATEGORIES.map((c) => ({ value: c, label: CAT_LABEL[c] }))} />
          </Field>
          <Field label="Class (optional)">
            <Select value={classId} onChange={setClassId} options={[{ value: "", label: "None" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Priority">
            <Select value={priority} onChange={(v) => setPriority(v as Priority)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={hasTime} onChange={setHasTime} label="Specific time" />
          {hasTime && <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />}
          <div className="flex-1" />
          <Field label="">
            <Select value={status} onChange={(v) => setStatus(v as TaskStatus)} options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          </Field>
        </div>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></Field>
        {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
      </div>
    </Modal>
  );
}
