"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Modal, Select, Spinner, Textarea, Toggle } from "../_lib/ui";
import { combineDateTime, toDateInputValue, toTimeInputValue } from "../_lib/datetime";
import { EVENT_CATEGORIES, type EventCategory, type EventDTO, type EventRecurrence } from "@/lib/atom/types";

export function EventForm({ existing, defaultDate, defaultEndDate, onClose, onSaved }: { existing?: EventDTO; defaultDate?: string; defaultEndDate?: string; onClose: () => void; onSaved: () => void }) {
  const editing = !!existing;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(existing?.category ?? "personal");
  const [date, setDate] = useState(existing ? toDateInputValue(existing.startAt) : defaultDate ?? "");
  const [endDate, setEndDate] = useState(existing?.endAt ? toDateInputValue(existing.endAt) : defaultEndDate ?? defaultDate ?? "");
  const [allDay, setAllDay] = useState(existing?.allDay ?? true);
  const [start, setStart] = useState(existing ? toTimeInputValue(existing.startAt) : "09:00");
  const [end, setEnd] = useState(existing?.endAt ? toTimeInputValue(existing.endAt) : "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [recurrence, setRecurrence] = useState<EventRecurrence>(existing?.recurrence ?? "none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(existing?.recurrenceEndAt ? toDateInputValue(existing.recurrenceEndAt) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!title.trim() || !date) {
      setError("A title and date are required.");
      return;
    }
    if (endDate && endDate < date) {
      setError("The end date cannot be before the start date.");
      return;
    }
    if (recurrence !== "none" && (!recurrenceEndDate || recurrenceEndDate < date)) {
      setError("Choose a repeat-until date after the start date.");
      return;
    }
    setBusy(true);
    setError("");
    const payload: Record<string, unknown> = {
      title: title.trim(),
      category,
      allDay,
      startAt: combineDateTime(date, allDay ? "00:00" : start),
      endAt: allDay ? combineDateTime(endDate || date, "23:59") : end ? combineDateTime(date, end) : null,
      recurrence,
      recurrenceEndAt: recurrence !== "none" ? combineDateTime(recurrenceEndDate, "23:59") : null,
      location: location.trim() || null,
      description: description.trim() || null,
    };
    try {
      if (editing) await api.updateEvent(existing!.id, payload);
      else await api.createEvent(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit event" : "New event"}
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : "Save"}</Btn></>}
    >
      <div className="space-y-3">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Club meeting" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => { const next = e.target.value; setDate(next); if (!endDate || endDate < next) setEndDate(next); }} /></Field>
          <Field label="Category">
            <Select value={category} onChange={(v) => setCategory(v as EventCategory)} options={EVENT_CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))} />
          </Field>
        </div>
        <Toggle checked={allDay} onChange={setAllDay} label="All day" />
        {allDay && <Field label="End date"><Input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} /></Field>}
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="End"><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Repeat">
            <Select value={recurrence} onChange={(v) => setRecurrence(v as EventRecurrence)} options={[{ value: "none", label: "Does not repeat" }, { value: "daily", label: "Every day" }, { value: "weekly", label: "Every week" }, { value: "monthly", label: "Every month" }]} />
          </Field>
          {recurrence !== "none" && <Field label="Repeat until"><Input type="date" value={recurrenceEndDate} min={date} onChange={(e) => setRecurrenceEndDate(e.target.value)} /></Field>}
        </div>
        <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" /></Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></Field>
        {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
      </div>
    </Modal>
  );
}
