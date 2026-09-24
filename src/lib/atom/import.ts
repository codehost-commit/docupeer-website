import "server-only";
import {
  AI_MODEL_ATOM_ASSIGNMENT,
  AI_MODEL_SMALL,
  GROQ_CHAT_COMPLETIONS_URL,
} from "@/lib/constants";
import { ASSIGNMENT_TYPES, WORK_STATUSES, type AssignmentType, type WorkStatus } from "./types";

// A single standardized gradebook row, pre-review. Everything is optional except name.
export interface ParsedRow {
  name: string;
  type: AssignmentType;
  category: string | null;
  pointsEarned: number | null;
  pointsPossible: number | null;
  dueDate: string | null; // ISO date (no time) when detected
  status: WorkStatus;
}

export interface ParsedClass {
  name: string;
  teacher: string | null;
  period: string | null;
  schoolYear: string | null;
  term: string | null;
  gradingSystem: "weighted" | "points";
  gpaWeight: "regular" | "honors" | "ap";
  importedGradePercent: number | null;
  importedGradeLetter: string | null;
  categories: { name: string; weight: number; dropLowest: number }[];
  rows: ParsedRow[];
}

export interface ParseResult {
  rows: ParsedRow[];
  classes: ParsedClass[];
  source: "groq" | "heuristic";
  warnings: string[];
}

function normalizeType(raw: string | null | undefined): AssignmentType {
  const s = (raw ?? "").toLowerCase();
  if (/(^|\b)(test|exam|midterm|final)\b/.test(s)) return "test";
  if (/\bquiz\b/.test(s)) return "quiz";
  if (/\bproject\b/.test(s)) return "project";
  if (/\blab\b/.test(s)) return "lab";
  if (/\bessay|paper|writing\b/.test(s)) return "essay";
  if (/\bpresent|speech\b/.test(s)) return "presentation";
  if (/\bhomework|hw|assignment|worksheet|classwork\b/.test(s)) return "homework";
  return (ASSIGNMENT_TYPES as string[]).includes(s) ? (s as AssignmentType) : "homework";
}

function normalizeStatus(raw: string | null | undefined, earned: number | null): WorkStatus {
  const s = (raw ?? "").toLowerCase();
  if (/miss|late|incomplete|^x$|zero/.test(s)) return "missing";
  if (/progress|started|doing/.test(s)) return "in_progress";
  if (/done|complete|graded|submitted|turned in/.test(s)) return "completed";
  if ((WORK_STATUSES as string[]).includes(s)) return s as WorkStatus;
  return earned !== null ? "completed" : "not_started";
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toISODate(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ---- Heuristic CSV/TSV fallback (used when Groq is unavailable) ----

function splitDelimited(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const delim = (lines[0]?.match(/\t/g)?.length ?? 0) > (lines[0]?.match(/,/g)?.length ?? 0) ? "\t" : ",";
  return lines.map((line) => {
    // Basic CSV: handles simple quoted fields.
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === delim && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((c) => c.trim().replace(/^"|"$/g, ""));
  });
}

function heuristicParse(text: string): ParseResult {
  const rows = splitDelimited(text);
  if (rows.length === 0) return { rows: [], classes: [], source: "heuristic", warnings: ["No rows detected."] };
  const header = rows[0].map((h) => h.toLowerCase());
  const find = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  const iName = find("assignment", "name", "title", "item");
  const iEarned = find("score", "earned", "grade", "points earned", "your");
  const iPossible = find("possible", "max", "out of", "total", "points possible");
  const iDue = find("due", "date");
  const iCat = find("category", "cat", "type of");
  const iType = find("type", "kind");
  const iStatus = find("status", "state");

  const warnings: string[] = [];
  if (iName === -1) warnings.push("Could not find an assignment-name column; using the first column.");

  const out: ParsedRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const nameCell = row[iName === -1 ? 0 : iName];
    if (!nameCell) continue;
    const earned = iEarned !== -1 ? toNumber(row[iEarned]) : null;
    out.push({
      name: nameCell.slice(0, 200),
      type: normalizeType(iType !== -1 ? row[iType] : iCat !== -1 ? row[iCat] : nameCell),
      category: iCat !== -1 && row[iCat] ? row[iCat].slice(0, 80) : null,
      pointsEarned: earned,
      pointsPossible: iPossible !== -1 ? toNumber(row[iPossible]) : null,
      dueDate: iDue !== -1 ? toISODate(row[iDue]) : null,
      status: normalizeStatus(iStatus !== -1 ? row[iStatus] : null, earned),
    });
  }
  return { rows: out, classes: [], source: "heuristic", warnings };
}

// ---- Groq standardization (primary path) ----

const SYSTEM = `You convert a student's messy gradebook or school grade report into strict JSON. You never invent classes, assignments, scores, or metadata. Return only JSON.`;

function userPrompt(raw: string): string {
  return `Extract every gradebook row from the text below into JSON of the form:
{"rows":[{"name":string,"type":one of ${JSON.stringify(ASSIGNMENT_TYPES)},"category":string|null,"pointsEarned":number|null,"pointsPossible":number|null,"dueDate":"YYYY-MM-DD"|null,"status":one of ${JSON.stringify(WORK_STATUSES)}}]}
Rules:
- "name" is the assignment title. Do not include the score in the name.
- pointsEarned/pointsPossible are numbers only (e.g. "18/20" -> earned 18, possible 20). Use null when unknown.
- Map free-text categories/types sensibly. If a row is a header, total, or average, skip it.
- dueDate only when a date is clearly present; otherwise null.
- status: "completed" if it has a score, else "not_started"; "missing" for missing/late/zero markers.
Text:
"""
${raw.slice(0, 12000)}
"""`;
}

function reportPrompt(raw: string): string {
  return `Extract every class and every grade/assignment visible in this school grade report into JSON:
{"classes":[{"name":string,"teacher":string|null,"period":string|null,"schoolYear":string|null,"term":string|null,"gradingSystem":"weighted"|"points","gpaWeight":"regular"|"honors"|"ap","importedGradePercent":number|null,"importedGradeLetter":string|null,"categories":[{"name":string,"weight":number,"dropLowest":number}],"rows":[{"name":string,"type":one of ${JSON.stringify(ASSIGNMENT_TYPES)},"category":string|null,"pointsEarned":number|null,"pointsPossible":number|null,"dueDate":"YYYY-MM-DD"|null,"status":one of ${JSON.stringify(WORK_STATUSES)}}]}],"rows":[]}
Rules:
- Create one class for each clearly named course. Do not make up a class name; if no course is visible, return an empty classes array.
- importedGradePercent is the overall percentage shown for the class, normalized to 0-100. importedGradeLetter is the letter shown, or null.
- Include assignment rows only when the report gives individual assignment names and scores. Skip totals, averages, headers, and duplicate summary rows.
- Use null for unknown metadata. Use "points" unless the report clearly labels category weights; use "weighted" only when weights are present.
- If a class has a current grade but no assignment rows, keep the class and its imported grade.
Report text:
"""
${raw.slice(0, 18000)}
"""`;
}

function parseJson(content: string): unknown {
  const stripped = content.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = Math.min(...[stripped.indexOf("{"), stripped.indexOf("[")].filter((n) => n >= 0));
    const end = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseRows(data: unknown): ParsedRow[] {
  const arr = Array.isArray(data) ? data : (data as { rows?: unknown[] } | null)?.rows;
  if (!Array.isArray(arr)) return [];
  const out: ParsedRow[] = [];
  for (const item of arr) {
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const earned = toNumber(row.pointsEarned);
    out.push({
      name: name.slice(0, 200),
      type: normalizeType(String(row.type ?? "")),
      category: row.category ? String(row.category).slice(0, 80) : null,
      pointsEarned: earned,
      pointsPossible: toNumber(row.pointsPossible),
      dueDate: toISODate(row.dueDate),
      status: normalizeStatus(String(row.status ?? ""), earned),
    });
  }
  return out;
}

function normalizeLetter(value: unknown): string | null {
  const letter = String(value ?? "").trim().toUpperCase();
  return letter && letter.length <= 4 ? letter : null;
}

function normalizeClass(item: unknown): ParsedClass | null {
  const raw = item as Record<string, unknown>;
  const name = String(raw.name ?? raw.course ?? raw.className ?? "").trim();
  if (!name) return null;
  const rawCategories = Array.isArray(raw.categories) ? raw.categories : [];
  const categories = rawCategories.slice(0, 20).flatMap((category) => {
    const c = category as Record<string, unknown>;
    const categoryName = String(c.name ?? "").trim();
    if (!categoryName) return [];
    return [{ name: categoryName.slice(0, 80), weight: Math.max(0, toNumber(c.weight) ?? 0), dropLowest: Math.max(0, Math.trunc(toNumber(c.dropLowest) ?? 0)) }];
  });
  const percent = toNumber(raw.importedGradePercent ?? raw.percent ?? raw.currentPercent ?? raw.gradePercent);
  return {
    name: name.slice(0, 120),
    teacher: raw.teacher ? String(raw.teacher).slice(0, 120) : null,
    period: raw.period ? String(raw.period).slice(0, 60) : null,
    schoolYear: raw.schoolYear ? String(raw.schoolYear).slice(0, 40) : null,
    term: raw.term ? String(raw.term).slice(0, 40) : null,
    gradingSystem: raw.gradingSystem === "weighted" ? "weighted" : "points",
    gpaWeight: raw.gpaWeight === "honors" || raw.gpaWeight === "ap" ? raw.gpaWeight : "regular",
    importedGradePercent: percent === null ? null : Math.max(0, Math.min(100, percent)),
    importedGradeLetter: normalizeLetter(raw.importedGradeLetter ?? raw.letter ?? raw.currentLetter),
    categories,
    rows: parseRows(raw.rows),
  };
}

function parseReport(content: string): { classes: ParsedClass[]; rows: ParsedRow[] } {
  const data = parseJson(content) as { classes?: unknown[]; rows?: unknown[] } | unknown[] | null;
  if (!data) return { classes: [], rows: [] };
  const classes = Array.isArray(data)
    ? []
    : (Array.isArray(data.classes) ? data.classes.flatMap((item) => { const parsed = normalizeClass(item); return parsed ? [parsed] : []; }) : []);
  const rows = Array.isArray(data) ? parseRows(data) : parseRows(data.rows);
  return { classes, rows };
}

async function groqJson(key: string, model: string, messages: unknown[]): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_completion_tokens: 5000,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return String(data?.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function standardizeGrades(raw: string): Promise<ParseResult> {
  const text = raw.trim();
  if (!text) return { rows: [], classes: [], source: "heuristic", warnings: ["Nothing to import."] };

  const key = process.env.GROQ_ATOM_API_KEY || process.env.GROQ_API_KEY;
  if (!key) return heuristicParse(text);

  for (const model of [AI_MODEL_ATOM_ASSIGNMENT, AI_MODEL_SMALL]) {
    const content = await groqJson(key, model, [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt(text) },
    ]);
    if (content) {
      const rows = parseRows(parseJson(content));
      if (rows.length > 0) return { rows, classes: [], source: "groq", warnings: [] };
    }
  }

  const fallback = heuristicParse(text);
  fallback.warnings.unshift("AI standardization was unavailable; used a basic parser. Please review carefully.");
  return fallback;
}

export async function standardizeGradeReport(raw: string): Promise<ParseResult> {
  const text = raw.trim();
  if (!text) return { rows: [], classes: [], source: "heuristic", warnings: ["No readable text was found in that report."] };
  const key = process.env.GROQ_ATOM_API_KEY || process.env.GROQ_API_KEY;
  if (!key) return { rows: [], classes: [], source: "heuristic", warnings: ["AI grade-report parsing is not configured. Add a Groq API key, or paste assignments into a class instead."] };

  const models = [...new Set([process.env.GROQ_ATOM_MODEL || AI_MODEL_ATOM_ASSIGNMENT, AI_MODEL_SMALL])];
  for (const model of models) {
    const content = await groqJson(key, model, [
      { role: "system", content: SYSTEM },
      { role: "user", content: reportPrompt(text) },
    ]);
    if (content) {
      const parsed = parseReport(content);
      if (parsed.classes.length > 0 || parsed.rows.length > 0) return { ...parsed, source: "groq", warnings: [] };
    }
  }
  return { rows: [], classes: [], source: "heuristic", warnings: ["The report could not be confidently parsed. Try a clearer image or paste the grade table as text."] };
}

export async function standardizeGradeImage(dataUri: string): Promise<ParseResult> {
  const key = process.env.GROQ_ATOM_API_KEY || process.env.GROQ_API_KEY;
  if (!key) return { rows: [], classes: [], source: "heuristic", warnings: ["AI image parsing is not configured. Add a Groq API key, or upload a text PDF instead."] };
  const model = process.env.GROQ_ATOM_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const content = await groqJson(key, model, [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        { type: "text", text: reportPrompt("Read the attached grade report image. Preserve every visible course, overall grade, and individual assignment score.") },
        { type: "image_url", image_url: { url: dataUri } },
      ],
    },
  ]);
  if (content) {
    const parsed = parseReport(content);
    if (parsed.classes.length > 0 || parsed.rows.length > 0) return { ...parsed, source: "groq", warnings: [] };
  }
  return { rows: [], classes: [], source: "heuristic", warnings: ["The image could not be confidently parsed. Try a sharper, well-lit photo with the full table visible."] };
}
