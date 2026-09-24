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

export interface ParseResult {
  rows: ParsedRow[];
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
  if (rows.length === 0) return { rows: [], source: "heuristic", warnings: ["No rows detected."] };
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
  return { rows: out, source: "heuristic", warnings };
}

// ---- Groq standardization (primary path) ----

const SYSTEM = `You convert a student's messy gradebook text (pasted, CSV, or OCR'd from a screenshot) into strict JSON. You never invent assignments. Return only JSON.`;

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

function parseModelRows(content: string): ParsedRow[] {
  const stripped = content.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
  let data: unknown;
  try {
    data = JSON.parse(stripped);
  } catch {
    return [];
  }
  const arr = Array.isArray(data) ? data : (data as { rows?: unknown[] })?.rows;
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

export async function standardizeGrades(raw: string): Promise<ParseResult> {
  const text = raw.trim();
  if (!text) return { rows: [], source: "heuristic", warnings: ["Nothing to import."] };

  const key = process.env.GROQ_ATOM_API_KEY || process.env.GROQ_API_KEY;
  if (!key) return heuristicParse(text);

  for (const model of [AI_MODEL_ATOM_ASSIGNMENT, AI_MODEL_SMALL]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt(text) },
          ],
          temperature: 0.1,
          max_completion_tokens: 4000,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
        }),
      }).finally(() => clearTimeout(timeout));
      if (!res.ok) continue;
      const data = await res.json();
      const content = String(data?.choices?.[0]?.message?.content ?? "").trim();
      const rows = parseModelRows(content);
      if (rows.length > 0) return { rows, source: "groq", warnings: [] };
    } catch {
      // try next model, then fall back
    }
  }

  const fallback = heuristicParse(text);
  fallback.warnings.unshift("AI standardization was unavailable; used a basic parser. Please review carefully.");
  return fallback;
}
