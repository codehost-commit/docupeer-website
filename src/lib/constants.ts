// Shared domain constants and option lists used on both client and server.

export const MIN_PAPER_WORDS = 350;
export const REVIEWS_PER_CREDIT = 2; // 2 completed reviews = 1 submission credit
export const DAILY_SUBMISSION_LIMIT = 1; // at most 1 paper per rolling 24h

// Expertise categories: STEM + appropriate non-STEM.
export const EXPERTISE_CATEGORIES = [
  // STEM
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Engineering",
  "Earth & Environmental Science",
  "Medicine & Health Sciences",
  // Non-STEM
  "Literature & Writing",
  "History",
  "Philosophy",
  "Economics",
  "Psychology",
  "Political Science",
  "Business",
  "Art & Design",
  "Law",
  "Education",
  "Social Sciences",
] as const;

export type ExpertiseCategory = (typeof EXPERTISE_CATEGORIES)[number];

export const EDUCATION_LEVELS = [
  { value: "high_school", label: "High school", needsGrade: true },
  { value: "college", label: "College / Undergraduate", needsGrade: true },
  { value: "graduate", label: "Graduate school", needsGrade: false },
  { value: "researcher", label: "Researcher", needsGrade: false },
  { value: "professor", label: "Professor / Educator", needsGrade: false },
  { value: "professional", label: "Professional", needsGrade: false },
  { value: "other", label: "Other", needsGrade: false },
] as const;

export type EducationLevelValue = (typeof EDUCATION_LEVELS)[number]["value"];

export const EDUCATION_LEVEL_VALUES = EDUCATION_LEVELS.map((l) => l.value);

export function educationLabel(value: string): string {
  return EDUCATION_LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function educationNeedsGrade(value: string): boolean {
  return EDUCATION_LEVELS.find((l) => l.value === value)?.needsGrade ?? false;
}

// Rough ordering used by the matching engine to gauge level proximity.
export const EDUCATION_RANK: Record<string, number> = {
  high_school: 1,
  college: 2,
  graduate: 3,
  researcher: 4,
  professor: 4,
  professional: 3,
  other: 2,
};

export const PAPER_TYPES = [
  "Essay",
  "Research Paper",
  "Lab Report",
  "Literature Review",
  "Thesis Chapter",
  "Case Study",
  "Creative Writing",
  "Report",
  "Other",
] as const;

export const ANNOTATION_KINDS = ["comment", "add", "remove"] as const;
export type AnnotationKind = (typeof ANNOTATION_KINDS)[number];

// --- Secretariat (AI paper assistant) -------------------------------------
// A "token" is one prompt to the main AI. The pool is derived server-side:
//   earned pool = STARTER_AI_MESSAGES + reviewsCompleted * TOKENS_PER_REVIEW
//   plus DAILY_FREE_MESSAGES per America/Chicago day (used first, resets at
//   local midnight). No client-writable balance exists.
export const STARTER_AI_MESSAGES = 2; // free prompts granted on sign-up
export const TOKENS_PER_REVIEW = 2; // each completed review unlocks 2 prompts
export const DAILY_FREE_MESSAGES = 1; // 1 free prompt per day (midnight CT reset)
export const SECRETARIAT_TZ = "America/Chicago"; // daily reset boundary

export const MIN_PROMPT_CHARS = 20; // minimum prompt length
export const MAX_PROMPT_WORDS = 250; // maximum prompt length (words)

// Uploaded papers have no length limit for the user, but we cap what we feed
// the model so a single request never exceeds the context window.
export const MAX_PAPER_CONTEXT_CHARS = 350_000;
export const ACCEPTED_PAPER_TYPES = [".pdf", ".docx"] as const;

export const AI_MODEL_MAIN = "openai/gpt-oss-120b"; // reads the paper + converses
export const AI_MODEL_SMALL = "openai/gpt-oss-20b"; // optimizes prompts + names chats

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
