// Server-side validation helpers. The client mirrors some of these for UX, but
// these functions are the source of truth. every write path calls them.

import {
  EDUCATION_LEVEL_VALUES,
  EXPERTISE_CATEGORIES,
  MIN_PAPER_WORDS,
  PAPER_TYPES,
  educationNeedsGrade,
} from "./constants";

export function countWords(text: string): number {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type FieldErrors = Record<string, string>;

export function validateRegistration(input: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  expertiseCategory?: unknown;
  specialty?: unknown;
  educationLevel?: unknown;
  gradeYear?: unknown;
  strength?: unknown;
}): { ok: true } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2) errors.name = "Please enter your name.";

  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < 8)
    errors.password = "Password must be at least 8 characters.";

  const category =
    typeof input.expertiseCategory === "string" ? input.expertiseCategory : "";
  if (!EXPERTISE_CATEGORIES.includes(category as never))
    errors.expertiseCategory = "Choose an expertise category.";

  const specialty =
    typeof input.specialty === "string" ? input.specialty.trim() : "";
  if (specialty.length < 2) errors.specialty = "Enter your specialty.";

  const educationLevel =
    typeof input.educationLevel === "string" ? input.educationLevel : "";
  if (!EDUCATION_LEVEL_VALUES.includes(educationLevel as never))
    errors.educationLevel = "Select your education level.";

  if (educationNeedsGrade(educationLevel)) {
    const gradeYear =
      typeof input.gradeYear === "string" ? input.gradeYear.trim() : "";
    if (!gradeYear) errors.gradeYear = "Enter your grade / year.";
  }

  const strength = Number(input.strength);
  if (!Number.isFinite(strength) || strength < 0 || strength > 100)
    errors.strength = "Strength must be between 0 and 100.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}

export function validatePaper(input: {
  title?: unknown;
  text?: unknown;
  category?: unknown;
  specialty?: unknown;
  educationLevel?: unknown;
  paperType?: unknown;
}): { ok: true; wordCount: number } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < 3) errors.title = "Give your paper a title.";
  if (title.length > 200) errors.title = "Title is too long.";

  const text = typeof input.text === "string" ? input.text : "";
  const wordCount = countWords(text);
  if (wordCount < MIN_PAPER_WORDS)
    errors.text = `Papers must be at least ${MIN_PAPER_WORDS} words (currently ${wordCount}).`;

  const category = typeof input.category === "string" ? input.category : "";
  if (!EXPERTISE_CATEGORIES.includes(category as never))
    errors.category = "Choose a category.";

  const specialty =
    typeof input.specialty === "string" ? input.specialty.trim() : "";
  if (specialty.length < 2) errors.specialty = "Enter a specialty / topic.";

  const educationLevel =
    typeof input.educationLevel === "string" ? input.educationLevel : "";
  if (!EDUCATION_LEVEL_VALUES.includes(educationLevel as never))
    errors.educationLevel = "Select the intended education level.";

  const paperType = typeof input.paperType === "string" ? input.paperType : "";
  if (!PAPER_TYPES.includes(paperType as never))
    errors.paperType = "Choose a paper type.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, wordCount };
}
