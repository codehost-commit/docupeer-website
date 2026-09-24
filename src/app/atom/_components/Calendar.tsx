"use client";

import { useMemo, useState } from "react";
import { addDays, formatDue, monthGrid, relativeDayLabel, startOfDay, weekRange } from "@/lib/atom/dates";
import { api } from "../_lib/api";
import { Badge, Btn, Card, Modal, Segmented, cx } from "../_lib/ui";
import { Dot } from "./bits";
import { Icon } from "./icons";
import { EventForm } from "./EventForm";
import type { CalItem } from "../_lib/items";
import type { SectionProps } from "../AtomApp";
import type { EventDTO } from "@/lib/atom/types";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function occurrenceIso(item: CalItem, day: Date, offset: number): string {
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  if (item.hasTime && offset === 0 && item.at) {
    const original = new Date(item.at);
    result.setHours(original.getHours(), original.getMinutes(), 0, 0);
  }
  return result.toISOString();
}

function nextOccurrence(date: Date, recurrence: NonNullable<CalItem["recurrence"]>): Date {
  if (recurrence === "daily") return addDays(date, 1);
  if (recurrence === "weekly") return addDays(date, 7);
  return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function expandCalendarItem(item: CalItem): CalItem[] {
  if (item.kind !== "event" || !item.at) return [item];
  const startDate = localDate(item.at);
  const originalEnd = item.endAt ? localDate(item.endAt) : startDate;
  const spanDays = Math.max(0, Math.round((originalEnd.getTime() - startDate.getTime()) / 86400000));
  const recurrence = item.recurrence && item.recurrence !== "none" ? item.recurrence : "none";
  const repeatUntil = item.recurrenceEndAt ? localDate(item.recurrenceEndAt) : startDate;
  const out: CalItem[] = [];
  let occurrence = startDate;
  for (let count = 0; count < 500 && occurrence <= repeatUntil; count++) {
    const occurrenceEnd = addDays(occurrence, spanDays);
    for (let offset = 0; offset <= spanDays; offset++) {
      const day = addDays(occurrence, offset);
      out.push({
        ...item,
        id: `${item.id}:${dayKey(day)}`,
        sourceId: item.id,
        at: occurrenceIso(item, day, offset),
        endAt: localIso(occurrenceEnd),
        spanStart: offset === 0,
        spanEnd: offset === spanDays,
      });
    }
    if (recurrence === "none") break;
    occurrence = nextOccurrence(occurrence, recurrence);
  }
  return out;
}

export function CalendarView({ state, items, refresh, setView }: SectionProps) {
  const [view, setViewMode] = useState<"month" | "week" | "day" | "agenda">("month");
  const [cursor, setCursor] = useState(new Date());
  const [detail, setDetail] = useState<CalItem | null>(null);
  const [addDate, setAddDate] = useState<{ start: string; end: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ start: string; end: string } | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const calendarItems = useMemo(() => items.flatMap(expandCalendarItem), [items]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const it of calendarItems) {
      if (!it.at) continue;
      const k = dayKey(new Date(it.at));
      const arr = m.get(k) || [];
      arr.push(it);
      m.set(k, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.at! < b.at! ? -1 : 1));
    return m;
  }, [calendarItems]);

  async function reschedule(item: CalItem, target: Date) {
    if (!item.at) return;
    const orig = new Date(item.at);
    const d = new Date(target);
    if (item.hasTime) d.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
    else d.setHours(23, 59, 0, 0);
    const iso = d.toISOString();
    if (item.kind === "ec") await api.updateEc(item.id, { dueAt: iso });
    else if (item.kind === "task") await api.updateTask(item.id, { dueAt: iso });
    else if (item.kind === "event") await api.updateEvent(item.sourceId || item.id, { startAt: iso });
    else await api.updateAssignment(item.id, { dueAt: iso });
    refresh();
  }

  const label =
    view === "month"
      ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "day"
        ? cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
        : view === "week"
          ? (() => { const { start, end } = weekRange(cursor); return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`; })()
          : "Agenda";

  function move(dir: number) {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === "week") setCursor(addDays(cursor, dir * 7));
    else setCursor(addDays(cursor, dir));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={view} onChange={(v) => setViewMode(v as typeof view)} options={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }, { value: "day", label: "Day" }, { value: "agenda", label: "Agenda" }]} />
        <div className="flex items-center gap-2">
          {view !== "agenda" && (
            <>
              <button onClick={() => move(-1)} className="rounded-lg border border-deep-border p-1.5 hover:bg-deep-panel2"><Icon name="chevron" size={16} className="rotate-180" /></button>
              <button onClick={() => setCursor(new Date())} className="rounded-lg border border-deep-border px-3 py-1.5 text-sm hover:bg-deep-panel2">Today</button>
              <button onClick={() => move(1)} className="rounded-lg border border-deep-border p-1.5 hover:bg-deep-panel2"><Icon name="chevron" size={16} /></button>
            </>
          )}
          <Btn size="sm" onClick={() => { const date = dayKey(view === "month" ? new Date() : cursor); setAddDate({ start: date, end: date }); }}><Icon name="plus" size={14} /> Event</Btn>
        </div>
      </div>
      <div className="font-display text-lg text-deep-text">{label}</div>

      {view === "month" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-deep-border bg-deep-panel2 text-center text-[11px] font-medium uppercase text-deep-dim">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid(cursor).map((day, i) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              const list = byDay.get(dayKey(day)) || [];
              const selected = selection && dayKey(day) >= selection.start && dayKey(day) <= selection.end;
              return (
                <div
                  key={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { const it = calendarItems.find((x) => x.id === dragId || x.sourceId === dragId); if (it) reschedule(it, day); setDragId(null); }}
                  onMouseDown={(e) => { if (e.button !== 0) return; const key = dayKey(day); setSelectionAnchor(key); setSelection({ start: key, end: key }); setSelecting(true); }}
                  onMouseEnter={() => { if (!selecting || !selectionAnchor) return; const key = dayKey(day); setSelection({ start: selectionAnchor <= key ? selectionAnchor : key, end: selectionAnchor <= key ? key : selectionAnchor }); }}
                  onMouseUp={() => { if (!selection) return; setAddDate(selection); setSelecting(false); setSelectionAnchor(null); }}
                  className={cx("relative min-h-[92px] border-b border-r border-deep-border p-1.5 last:border-r-0", !inMonth && "bg-deep-panel2/40", selected && "bg-deep-accent-soft/35", "cursor-crosshair")}
                >
                  <div className={cx("mb-1 text-right text-xs", isToday ? "font-bold text-deep-accent" : inMonth ? "text-deep-text-soft" : "text-deep-dim")}>{day.getDate()}</div>
                  {selected && <div className="pointer-events-none absolute left-0 right-0 top-7 h-2 bg-deep-accent/45" />}
                  <div className="space-y-1">
                    {list.slice(0, 3).map((it) => (
                      <div
                        key={it.kind + it.id}
                        draggable={it.kind !== "event" || !!it.spanStart}
                        onDragStart={(e) => { e.stopPropagation(); setDragId(it.sourceId || it.id); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setDetail(it); }}
                        className={cx("flex items-center gap-1 px-1 py-0.5 text-[10px]", it.kind === "event" ? "-mx-1.5 min-h-5 bg-deep-accent/20 font-medium text-deep-accent" : "rounded", it.kind === "event" && it.spanStart && "rounded-l", it.kind === "event" && it.spanEnd && "rounded-r", it.done && "opacity-50")}
                        style={{ background: `${it.color}1f`, color: it.color }}
                      >
                        {it.kind !== "event" && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: it.color }} />}
                        <span className="truncate">{it.title}</span>
                      </div>
                    ))}
                    {list.length > 3 && <div className="px-1 text-[10px] text-deep-dim">+{list.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "week" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(weekRange(cursor).start, i)).map((day) => {
            const list = byDay.get(dayKey(day)) || [];
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <Card key={day.toISOString()} className={cx("p-2", isToday && "ring-2 ring-deep-accent-soft")}>
                <div className="mb-2 text-center text-xs font-medium text-deep-dim">{day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</div>
                <div className="space-y-1">
                  {list.map((it) => <DayItem key={it.kind + it.id} item={it} onClick={() => setDetail(it)} />)}
                  {list.length === 0 && <div className="py-2 text-center text-[10px] text-deep-dim">-</div>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {view === "day" && (
        <Card className="p-3">
          {(byDay.get(dayKey(cursor)) || []).length === 0 ? (
            <div className="py-8 text-center text-sm text-deep-dim">Nothing scheduled.</div>
          ) : (
            <div className="space-y-1">{(byDay.get(dayKey(cursor)) || []).map((it) => <DayItem key={it.kind + it.id} item={it} onClick={() => setDetail(it)} big />)}</div>
          )}
        </Card>
      )}

      {view === "agenda" && (
        <Card className="p-3">
          {(() => {
            const upcoming = items.filter((i) => i.at && new Date(i.at) >= startOfDay(new Date())).sort((a, b) => (a.at! < b.at! ? -1 : 1)).slice(0, 60);
            if (upcoming.length === 0) return <div className="py-8 text-center text-sm text-deep-dim">No upcoming items.</div>;
            let lastLabel = "";
            return upcoming.map((it) => {
              const l = relativeDayLabel(new Date(it.at!));
              const showHdr = l !== lastLabel;
              lastLabel = l;
              return (
                <div key={it.kind + it.id}>
                  {showHdr && <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-deep-dim">{l}</div>}
                  <DayItem item={it} onClick={() => setDetail(it)} big />
                </div>
              );
            });
          })()}
        </Card>
      )}

      <Legend />

      {detail && <ItemDetail item={detail} onClose={() => setDetail(null)} refresh={refresh} setView={setView} state={state} />}
      {addDate && <EventForm defaultDate={addDate.start} defaultEndDate={addDate.end} onClose={() => { setAddDate(null); setSelection(null); setSelectionAnchor(null); }} onSaved={refresh} />}
    </div>
  );
}

function DayItem({ item, onClick, big }: { item: CalItem; onClick: () => void; big?: boolean }) {
  return (
    <button onClick={onClick} className={cx("flex w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-deep-panel2", big ? "py-2" : "py-1")}>
      <Dot color={item.color} size={8} />
      <span className={cx("min-w-0 flex-1 truncate", big ? "text-sm" : "text-xs", item.done ? "text-deep-dim line-through" : "text-deep-text")}>{item.title}</span>
      {item.hasTime && item.at && <span className="text-[10px] text-deep-dim">{new Date(item.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>}
    </button>
  );
}

function Legend() {
  const entries = [{ c: "#356d97", l: "Academic" }, { c: "#7c5cbf", l: "EC" }, { c: "#4f8a5f", l: "Personal" }, { c: "#b3455e", l: "Overdue / high" }];
  return (
    <div className="flex flex-wrap gap-3 text-xs text-deep-dim">
      {entries.map((e) => <span key={e.l} className="flex items-center gap-1.5"><Dot color={e.c} size={8} /> {e.l}</span>)}
      <span className="text-deep-dim">· Drag an item in Month view to reschedule.</span>
    </div>
  );
}

function ItemDetail({ item, onClose, refresh, setView, state }: { item: CalItem; onClose: () => void; refresh: () => Promise<void>; setView: (v: string) => void; state: SectionProps["state"] }) {
  const canComplete = item.kind !== "event";
  async function toggle() {
    const status = item.done ? "not_started" : "completed";
    if (item.kind === "ec") await api.updateEc(item.id, { status });
    else if (item.kind === "task") await api.updateTask(item.id, { status });
    else await api.updateAssignment(item.id, { status });
    await refresh();
    onClose();
  }
  async function del() {
    if (item.kind === "ec") await api.deleteEc(item.id);
    else if (item.kind === "task") await api.deleteTask(item.id);
    else if (item.kind === "event") await api.deleteEvent(item.sourceId || item.id);
    else await api.deleteAssignment(item.id);
    await refresh();
    onClose();
  }
  return (
    <Modal
      title={item.title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={del}><Icon name="trash" size={14} /> Delete</Btn>
          <Btn variant="outline" onClick={() => { onClose(); setView(item.href.replace("#/", "")); }}>Open</Btn>
          {canComplete && <Btn onClick={toggle}>{item.done ? "Mark not done" : "Mark done"}</Btn>}
        </>
      }
    >
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><Badge color={item.color}>{item.kindLabel}</Badge>{item.subtitle && <span className="text-deep-dim">{item.subtitle}</span>}</div>
        {item.at && <div className="text-deep-text-soft">{formatDue(item.at, item.hasTime)}</div>}
      </div>
    </Modal>
  );
}
