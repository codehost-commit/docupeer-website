// Shared, Prisma-free types & constants for Atom (the student planner).
// Client and server both import from here. Dates crossing the API are ISO strings.

export type AssignmentType =
  | "homework"
  | "quiz"
  | "test"
  | "project"
  | "lab"
  | "essay"
  | "presentation"
  | "other";

export const ASSIGNMENT_TYPES: AssignmentType[] = [
  "homework",
  "quiz",
  "test",
  "project",
  "lab",
  "essay",
  "presentation",
  "other",
];

export const ASSIGNMENT_TYPE_LABEL: Record<AssignmentType, string> = {
  homework: "Homework",
  quiz: "Quiz",
  test: "Test",
  project: "Project",
  lab: "Lab",
  essay: "Essay",
  presentation: "Presentation",
  other: "Other",
};

export type WorkStatus = "not_started" | "in_progress" | "completed" | "missing";
export const WORK_STATUSES: WorkStatus[] = ["not_started", "in_progress", "completed", "missing"];
export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  missing: "Missing",
};

export type TaskStatus = "not_started" | "in_progress" | "completed";
export const TASK_STATUSES: TaskStatus[] = ["not_started", "in_progress", "completed"];

export type Priority = "low" | "medium" | "high";
export const PRIORITIES: Priority[] = ["low", "medium", "high"];
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export type EcType =
  | "competition"
  | "tournament"
  | "club_application"
  | "leadership"
  | "summer_program"
  | "research"
  | "scholarship"
  | "audition"
  | "tryout"
  | "conference"
  | "other";

export const EC_TYPES: EcType[] = [
  "competition",
  "tournament",
  "club_application",
  "leadership",
  "summer_program",
  "research",
  "scholarship",
  "audition",
  "tryout",
  "conference",
  "other",
];

export const EC_TYPE_LABEL: Record<EcType, string> = {
  competition: "Competition registration",
  tournament: "Tournament registration",
  club_application: "Club application",
  leadership: "Leadership application",
  summer_program: "Summer program",
  research: "Research program",
  scholarship: "Scholarship",
  audition: "Audition",
  tryout: "Tryout",
  conference: "Conference",
  other: "Other opportunity",
};

export type TaskCategory = "academic" | "ec" | "personal";
export const TASK_CATEGORIES: TaskCategory[] = ["academic", "ec", "personal"];

export type EventCategory = "academic" | "ec" | "personal" | "other";
export type EventRecurrence = "none" | "daily" | "weekly" | "monthly";
export const EVENT_CATEGORIES: EventCategory[] = ["academic", "ec", "personal", "other"];

export type GradingSystem = "weighted" | "points";
export type GpaScale = "4.0" | "5.0" | "percent" | "none";
export type GpaWeight = "regular" | "honors" | "ap";
export const GPA_WEIGHT_BUMP: Record<GpaWeight, number> = { regular: 0, honors: 0.5, ap: 1 };

// Unified "calendar kind" used across dashboard, calendar, notifications.
export type ItemKind = "assignment" | "test" | "project" | "ec" | "task" | "event";

// Visual categorization (spec: Academic=blue, EC=purple, Personal=green, high=red).
export const CATEGORY_COLORS = {
  academic: "#356d97",
  ec: "#7c5cbf",
  personal: "#4f8a5f",
  other: "#6a7495",
  high: "#b3455e",
} as const;

// Reminder offsets in MINUTES before the due moment.
export const REMINDER_PRESETS: { key: string; label: string; minutes: number }[] = [
  { key: "7d", label: "7 days before", minutes: 7 * 24 * 60 },
  { key: "3d", label: "3 days before", minutes: 3 * 24 * 60 },
  { key: "1d", label: "1 day before", minutes: 24 * 60 },
  { key: "1h", label: "1 hour before", minutes: 60 },
];

export type ReminderScope = "assignment" | "test" | "project" | "ec" | "task";
export const DEFAULT_REMINDERS: Record<ReminderScope, number[]> = {
  assignment: [24 * 60],
  test: [7 * 24 * 60, 24 * 60],
  project: [7 * 24 * 60, 24 * 60],
  ec: [7 * 24 * 60, 3 * 24 * 60, 24 * 60],
  task: [24 * 60],
};

export function reminderScopeForAssignment(type: AssignmentType): ReminderScope {
  if (type === "test" || type === "quiz") return "test";
  if (type === "project") return "project";
  return "assignment";
}

// ---- Client-facing DTOs (JSON shapes returned by the API) ----
export interface CategoryDTO {
  id: string;
  name: string;
  weight: number;
  dropLowest: number;
  sortOrder: number;
}

export interface ClassDTO {
  id: string;
  name: string;
  teacher: string | null;
  period: string | null;
  schoolYear: string | null;
  term: string | null;
  credits: number | null;
  gradingSystem: GradingSystem;
  color: string;
  includeInGpa: boolean;
  gpaWeight: GpaWeight;
  importedGradePercent: number | null;
  importedGradeLetter: string | null;
  archived: boolean;
  sortOrder: number;
  categories: CategoryDTO[];
}

export interface AssignmentDTO {
  id: string;
  classId: string | null;
  categoryId: string | null;
  name: string;
  type: AssignmentType;
  description: string | null;
  dueAt: string | null;
  hasTime: boolean;
  pointsEarned: number | null;
  pointsPossible: number | null;
  status: WorkStatus;
  notes: string | null;
}

export interface EcDeadlineDTO {
  id: string;
  name: string;
  organization: string | null;
  type: EcType;
  dueAt: string | null;
  hasTime: boolean;
  priority: Priority;
  status: TaskStatus;
  link: string | null;
  notes: string | null;
}

export interface TaskDTO {
  id: string;
  classId: string | null;
  title: string;
  description: string | null;
  dueAt: string | null;
  hasTime: boolean;
  priority: Priority;
  status: TaskStatus;
  category: TaskCategory;
  relatedType: string | null;
  relatedId: string | null;
  notes: string | null;
}

export interface EventDTO {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  recurrence: EventRecurrence;
  recurrenceEndAt: string | null;
  category: EventCategory;
  color: string | null;
  location: string | null;
}
