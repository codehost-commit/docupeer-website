// Client data layer for Atom. Talks only to /api/atom/* and computes grades
// locally with the shared, pure grade engine.
import {
  computeClassGrade,
  cumulativeGpa,
  type ClassGradeResult,
} from "@/lib/atom/grades";
import type {
  AssignmentDTO,
  ClassDTO,
  EcDeadlineDTO,
  EventDTO,
  GpaScale,
  GradingSystem,
  TaskDTO,
} from "@/lib/atom/types";

export interface AtomProfile {
  id: string;
  name: string;
  email: string;
  onboarded: boolean;
  gradeLevel: string | null;
  avatarUrl: string | null;
  gpaScale: GpaScale;
}

export interface AtomSettingsShape {
  pushEnabled: boolean;
  emailEnabled: boolean;
  reminderDefaults: Record<string, number[]>;
  categoryMutes: Record<string, boolean>;
  quietHours: { enabled: boolean; start: string; end: string };
  timezone: string;
}

export interface Snapshot {
  classId: string;
  percent: number;
  letter: string | null;
  capturedAt: string;
}

export interface AtomState {
  profile: AtomProfile;
  settings: AtomSettingsShape;
  classes: ClassDTO[];
  assignments: AssignmentDTO[];
  ec: EcDeadlineDTO[];
  tasks: TaskDTO[];
  events: EventDTO[];
  snapshots: Snapshot[];
}

async function jfetch<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}
const body = (v: unknown) => JSON.stringify(v);

export const api = {
  // auth + profile
  me: () => jfetch<{ id: string } | { error: string }>("/api/atom/me"),
  register: (b: { name: string; email: string; password: string }) =>
    jfetch("/api/atom/auth/register", { method: "POST", body: body(b) }),
  login: (b: { email: string; password: string }) =>
    jfetch("/api/atom/auth/login", { method: "POST", body: body(b) }),
  logout: () => jfetch("/api/atom/auth/logout", { method: "POST" }),
  state: () => jfetch<AtomState>("/api/atom/state"),
  updateProfile: (b: Record<string, unknown>) => jfetch("/api/atom/me", { method: "PATCH", body: body(b) }),

  // classes + categories
  createClass: (b: Record<string, unknown>) => jfetch("/api/atom/classes", { method: "POST", body: body(b) }),
  updateClass: (id: string, b: Record<string, unknown>) =>
    jfetch(`/api/atom/classes/${id}`, { method: "PATCH", body: body(b) }),
  deleteClass: (id: string) => jfetch(`/api/atom/classes/${id}`, { method: "DELETE" }),
  createCategory: (b: Record<string, unknown>) => jfetch("/api/atom/categories", { method: "POST", body: body(b) }),
  updateCategory: (id: string, b: Record<string, unknown>) =>
    jfetch(`/api/atom/categories/${id}`, { method: "PATCH", body: body(b) }),
  deleteCategory: (id: string) => jfetch(`/api/atom/categories/${id}`, { method: "DELETE" }),

  // assignments / ec / tasks / events
  createAssignment: (b: Record<string, unknown>) => jfetch("/api/atom/assignments", { method: "POST", body: body(b) }),
  updateAssignment: (id: string, b: Record<string, unknown>) =>
    jfetch(`/api/atom/assignments/${id}`, { method: "PATCH", body: body(b) }),
  deleteAssignment: (id: string) => jfetch(`/api/atom/assignments/${id}`, { method: "DELETE" }),
  createEc: (b: Record<string, unknown>) => jfetch("/api/atom/ec", { method: "POST", body: body(b) }),
  updateEc: (id: string, b: Record<string, unknown>) => jfetch(`/api/atom/ec/${id}`, { method: "PATCH", body: body(b) }),
  deleteEc: (id: string) => jfetch(`/api/atom/ec/${id}`, { method: "DELETE" }),
  createTask: (b: Record<string, unknown>) => jfetch("/api/atom/tasks", { method: "POST", body: body(b) }),
  updateTask: (id: string, b: Record<string, unknown>) =>
    jfetch(`/api/atom/tasks/${id}`, { method: "PATCH", body: body(b) }),
  deleteTask: (id: string) => jfetch(`/api/atom/tasks/${id}`, { method: "DELETE" }),
  createEvent: (b: Record<string, unknown>) => jfetch("/api/atom/events", { method: "POST", body: body(b) }),
  updateEvent: (id: string, b: Record<string, unknown>) =>
    jfetch(`/api/atom/events/${id}`, { method: "PATCH", body: body(b) }),
  deleteEvent: (id: string) => jfetch(`/api/atom/events/${id}`, { method: "DELETE" }),

  // settings, danger zone, import
  settingsPatch: (b: Record<string, unknown>) => jfetch("/api/atom/settings", { method: "PATCH", body: body(b) }),
  reset: (confirmName: string) => jfetch("/api/atom/reset", { method: "POST", body: body({ confirmName }) }),
  importParse: (b: { kind: string; text?: string }) => jfetch("/api/atom/import/parse", { method: "POST", body: body(b) }),
  importParseFile: (file: File) => fetch("/api/atom/import/parse", { method: "POST", body: (() => { const data = new FormData(); data.append("file", file); return data; })(), credentials: "same-origin" }).then(async (res) => { const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`); return data; }),
  importCommit: (b: { classId?: string; rows?: unknown[]; classes?: unknown[] }) =>
    jfetch("/api/atom/import/commit", { method: "POST", body: body(b) }),

  // notifications + push
  pushKey: () => jfetch<{ key: string; configured: boolean }>("/api/atom/push/key"),
  pushSubscribe: (subscription: unknown) => jfetch("/api/atom/push/subscribe", { method: "POST", body: body({ subscription }) }),
  pushUnsubscribe: (endpoint: string) => jfetch("/api/atom/push/unsubscribe", { method: "POST", body: body({ endpoint }) }),
  pushTest: () => jfetch<{ push: { sent: number }; email: boolean; pushConfigured: boolean; emailConfigured: boolean }>("/api/atom/push/test", { method: "POST" }),
  notifications: () => jfetch<{ notifications: NotificationRow[]; unreadCount: number }>("/api/atom/notifications"),
  markNotifications: (b: { id?: string; all?: boolean }) => jfetch("/api/atom/notifications", { method: "PATCH", body: body(b) }),
  clearNotifications: () => jfetch("/api/atom/notifications", { method: "DELETE" }),
};

export interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string | null;
  itemType: string | null;
  itemId: string | null;
  readAt: string | null;
  createdAt: string;
}

// ---- Derived grades ----

export type Trend = "up" | "down" | "flat";
export interface ClassGrade extends ClassGradeResult {
  trend: Trend;
  delta: number | null;
  history: { at: string; percent: number }[];
}

export function computeGrade(cls: ClassDTO, assignments: AssignmentDTO[], snapshots: Snapshot[]): ClassGrade {
  const items = assignments
    .filter((a) => a.classId === cls.id)
    .map((a) => ({ categoryId: a.categoryId, pointsEarned: a.pointsEarned, pointsPossible: a.pointsPossible }));
  const base = computeClassGrade({
    gradingSystem: cls.gradingSystem as GradingSystem,
    categories: cls.categories.map((c) => ({ id: c.id, name: c.name, weight: c.weight, dropLowest: c.dropLowest })),
    items,
  });
  const imported = base.percent === null && cls.importedGradePercent != null
    ? {
        ...base,
        percent: cls.importedGradePercent,
        letter: cls.importedGradeLetter,
      }
    : base;
  const history = snapshots
    .filter((s) => s.classId === cls.id)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .map((s) => ({ at: s.capturedAt, percent: s.percent }));
  let trend: Trend = "flat";
  let delta: number | null = null;
  if (history.length >= 2 && imported.percent !== null) {
    delta = Math.round((imported.percent - history[history.length - 2].percent) * 100) / 100;
    trend = delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat";
  }
  return { ...imported, trend, delta, history };
}

export function computeGpa(state: AtomState, grades: Map<string, ClassGrade>): number | null {
  return cumulativeGpa(
    state.classes
      .filter((c) => !c.archived)
      .map((c) => ({
        percent: grades.get(c.id)?.percent ?? null,
        credits: c.credits ?? 1,
        includeInGpa: c.includeInGpa,
        gpaWeight: c.gpaWeight,
      })),
    state.profile.gpaScale,
  );
}
