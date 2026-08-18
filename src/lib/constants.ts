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
