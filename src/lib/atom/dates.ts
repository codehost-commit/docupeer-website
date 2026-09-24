// Pure date & reminder helpers for Atom. No Prisma, no timezone libraries.
// Times are stored as ISO (UTC) in the DB; the client renders in local time,
// the cron computes in the user's stored IANA timezone via Intl.

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

// Sunday-based week containing `d`.
export function weekRange(d: Date): { start: Date; end: Date } {
  const start = startOfDay(addDays(d, -d.getDay()));
  return { start, end: endOfDay(addDays(start, 6)) };
}

// Calendar-month grid (always 6 rows x 7 cols) covering the month of `d`.
export function monthGrid(d: Date): Date[] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const gridStart = addDays(startOfDay(first), -first.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  return days;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// "Today" / "Tomorrow" / "Yesterday" / weekday (within a week) / date.
export function relativeDayLabel(target: Date, now = new Date()): string {
  const diff = daysBetween(now, target);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return WEEKDAYS[target.getDay()];
  if (diff < -1 && diff > -7) return `Last ${WEEKDAYS[target.getDay()]}`;
  return target.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Short human distance for upcoming lists: "Today" / "Tomorrow" / "3 days" / "Fri".
export function shortDistance(target: Date, now = new Date()): string {
  const diff = daysBetween(now, target);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `${diff} days`;
  return target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type DueBucket = "none" | "overdue" | "today" | "soon" | "upcoming";

// Bucket a due date relative to now. `soonDays` = the "next few days" window.
export function dueBucket(dueISO: string | null, now = new Date(), soonDays = 3): DueBucket {
  if (!dueISO) return "none";
  const due = new Date(dueISO);
  if (due.getTime() < now.getTime()) return "overdue";
  const d = daysBetween(now, due);
  if (d === 0) return "today";
  if (d <= soonDays) return "soon";
  return "upcoming";
}

export function formatDue(dueISO: string | null, hasTime: boolean): string {
  if (!dueISO) return "No due date";
  const due = new Date(dueISO);
  const date = due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (!hasTime) return date;
  const time = due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

// ---- Reminder scheduling ----

export interface ReminderInstant {
  offsetMinutes: number;
  at: Date;
}

// Concrete reminder moments = due - each offset. Past reminders are dropped
// unless `keepPast` (the cron passes a small look-back window instead).
export function reminderInstants(dueISO: string | null, offsets: number[], now?: Date): ReminderInstant[] {
  if (!dueISO) return [];
  const due = new Date(dueISO).getTime();
  const list = offsets
    .map((offsetMinutes) => ({ offsetMinutes, at: new Date(due - offsetMinutes * MIN) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  if (!now) return list;
  return list.filter((r) => r.at.getTime() >= now.getTime());
}

// Is a reminder "firing" inside the polling window (windowStart, windowEnd]?
export function reminderDueInWindow(at: Date, windowStart: Date, windowEnd: Date): boolean {
  const t = at.getTime();
  return t > windowStart.getTime() && t <= windowEnd.getTime();
}

// A stable per-user dedupe key so a reminder is only ever sent once.
export function reminderDedupeKey(itemType: string, itemId: string, offsetMinutes: number): string {
  return `rem:${itemType}:${itemId}:${offsetMinutes}`;
}

// Format an offset in minutes as a friendly label ("1 hour before", "3 days before").
export function offsetLabel(minutes: number): string {
  if (minutes % (24 * 60) === 0) {
    const d = minutes / (24 * 60);
    return d === 1 ? "1 day before" : `${d} days before`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? "1 hour before" : `${h} hours before`;
  }
  return `${minutes} minutes before`;
}
