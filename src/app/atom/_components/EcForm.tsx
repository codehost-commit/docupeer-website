"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Modal, Select, Spinner, Textarea, Toggle } from "../_lib/ui";
import { combineDateTime, toDateInputValue, toTimeInputValue } from "../_lib/datetime";
import {
  EC_TYPES,
  EC_TYPE_LABEL,
  PRIORITIES,
  PRIORITY_LABEL,
  TASK_STATUSES,
  type EcDeadlineDTO,
  type EcType,
  type Priority,
  type TaskStatus,
} from "@/lib/atom/types";

const STATUS_LABEL: Record<TaskStatus, string> = { not_started: "Not started", in_progress: "In progress", completed: "Completed" };

export function EcForm({ existing, onClose, onSaved }: { existing?: EcDeadlineDTO; onClose: () => void; onSaved: () => void }) {
  const editing = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [organization, setOrganization] = useState(existing?.organization ?? "");
  const [type, setType] = useState<EcType>(existing?.type ?? "other");
  const [date, setDate] = useState(toDateInputValue(existing?.dueAt ?? null));
  const [hasTime, setHasTime] = useState(existing?.hasTime ?? false);
  const [time, setTime] = useState(toTimeInputValue(existing?.dueAt ?? null) || "23:59");
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? "not_started");
  const [link, setLink] = useState(existing?.link ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError("");
    const payload: Record<string, unknown> = {
      name: name.trim(),
      organization: organization.trim() || null,
      type,
      dueAt: date ? combineDateTime(date, hasTime ? time : null) : null,
      hasTime: !!(date && hasTime),
      priority,
      status,
      link: link.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (editing) await api.updateEc(existing!.id, payload);
      else await api.createEc(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit deadline" : "New EC deadline"}
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : "Save"}</Btn></>}
    >
      <div className="space-y-3">
        <Field label="Opportunity"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Research Program" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Organization"><Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="XYZ University" /></Field>
          <Field label="Type">
            <Select value={type} onChange={(v) => setType(v as EcType)} options={EC_TYPES.map((t) => ({ value: t, label: EC_TYPE_LABEL[t] }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Priority">
            <Select value={priority} onChange={(v) => setPriority(v as Priority)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={hasTime} onChange={setHasTime} label="Specific time" />
          {hasTime && <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={status} onChange={(v) => setStatus(v as TaskStatus)} options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          </Field>
          <Field label="Application link"><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></Field>
        </div>
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
        {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
      </div>
    </Modal>
  );
}
