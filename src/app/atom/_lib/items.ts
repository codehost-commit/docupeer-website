// Flatten Atom entities into one unified list for the dashboard, calendar, and reminders view.
import { ASSIGNMENT_TYPE_LABEL, EC_TYPE_LABEL, CATEGORY_COLORS } from "@/lib/atom/types";
import type { AtomState } from "./api";

export type CalKind = "assignment" | "test" | "project" | "ec" | "task" | "event";

export interface CalItem {
  id: string;
  kind: CalKind;
  kindLabel: string;
  title: string;
  subtitle: string;
  at: string | null;
  hasTime: boolean;
  color: string;
  priority: string | null;
  status: string;
  done: boolean;
  classId: string | null;
  href: string; // hash route to the owning section
}

export function buildItems(state: AtomState): CalItem[] {
  const classById = new Map(state.classes.map((c) => [c.id, c]));
  const items: CalItem[] = [];

  for (const a of state.assignments) {
    const cls = a.classId ? classById.get(a.classId) : null;
    const kind: CalKind = a.type === "test" || a.type === "quiz" ? "test" : a.type === "project" ? "project" : "assignment";
    items.push({
      id: a.id,
      kind,
      kindLabel: ASSIGNMENT_TYPE_LABEL[a.type],
      title: a.name,
      subtitle: [cls?.name, ASSIGNMENT_TYPE_LABEL[a.type]].filter(Boolean).join(" · "),
      at: a.dueAt,
      hasTime: a.hasTime,
      color: cls?.color || CATEGORY_COLORS.academic,
      priority: null,
      status: a.status,
      done: a.status === "completed",
      classId: a.classId,
      href: "#/academics",
    });
  }

  for (const e of state.ec) {
    items.push({
      id: e.id,
      kind: "ec",
      kindLabel: "EC",
      title: e.name,
      subtitle: [e.organization, EC_TYPE_LABEL[e.type]].filter(Boolean).join(" · "),
      at: e.dueAt,
      hasTime: e.hasTime,
      color: CATEGORY_COLORS.ec,
      priority: e.priority,
      status: e.status,
      done: e.status === "completed",
      classId: null,
      href: "#/ec",
    });
  }

  for (const t of state.tasks) {
    const cls = t.classId ? classById.get(t.classId) : null;
    items.push({
      id: t.id,
      kind: "task",
      kindLabel: "Task",
      title: t.title,
      subtitle: [cls?.name, t.category.toUpperCase()].filter(Boolean).join(" · "),
      at: t.dueAt,
      hasTime: t.hasTime,
      color: CATEGORY_COLORS[t.category] || CATEGORY_COLORS.personal,
      priority: t.priority,
      status: t.status,
      done: t.status === "completed",
      classId: t.classId,
      href: "#/tasks",
    });
  }

  for (const ev of state.events) {
    items.push({
      id: ev.id,
      kind: "event",
      kindLabel: "Event",
      title: ev.title,
      subtitle: [ev.location, ev.category].filter(Boolean).join(" · "),
      at: ev.startAt,
      hasTime: !ev.allDay,
      color: ev.color || CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.other,
      priority: null,
      status: "",
      done: false,
      classId: null,
      href: "#/calendar",
    });
  }

  return items;
}
