// Secretariat — the AI paper assistant. Consolidated server module:
//   1. Token-pool logic (server-authoritative; no client-writable balance)
//   2. Groq model calls (main GPT-OSS-120B + small openai/gpt-oss-20b helper)
//   3. Paper text extraction (PDF via unpdf, DOCX via mammoth)
import {
  STARTER_AI_MESSAGES,
  TOKENS_PER_REVIEW,
  DAILY_FREE_MESSAGES,
  SECRETARIAT_TZ,
  MAX_PAPER_CONTEXT_CHARS,
  AI_MODEL_MAIN,
  AI_MODEL_SMALL,
} from "./constants";
import { prisma } from "./db";

// ---------------------------------------------------------------------------
// 1. Token pool
// ---------------------------------------------------------------------------

export type TokenStatus = {
  reviewsCompleted: number;
  starterMessages: number;
  earnedFromReviews: number; // reviewsCompleted * TOKENS_PER_REVIEW
  earnedTotal: number; // starter + earnedFromReviews
  earnedUsed: number; // prompts spent from the earned pool
  earnedAvailable: number; // max(0, earnedTotal - earnedUsed)
  dailyAvailable: number; // 0 or 1 — the free daily prompt, if unused today
  totalAvailable: number; // earnedAvailable + dailyAvailable
  nextDailyResetAt: string; // ISO of the next local (CT) midnight
};

// YYYY-MM-DD for the given instant in the Secretariat timezone.
export function localDateString(now: Date = new Date()): string {
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SECRETARIAT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// The next local-midnight boundary (when the daily free prompt resets).
export function nextLocalMidnight(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SECRETARIAT_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  let h = get("hour");
  if (h === 24) h = 0; // some engines emit 24 for midnight
  const secsIntoDay = h * 3600 + get("minute") * 60 + get("second");
  const secsLeft = 24 * 3600 - secsIntoDay;
  return new Date(now.getTime() + secsLeft * 1000);
}

// Pure, DB-free derivation so the rules can be reasoned about / unit-tested.
export function computeTokenStatus(input: {
  reviewsCompleted: number;
  aiPromptsUsed: number;
  aiDailyDate: string | null;
  now?: Date;
}): TokenStatus {
  const now = input.now ?? new Date();
  const reviewsCompleted = Math.max(0, input.reviewsCompleted);
  const earnedFromReviews = reviewsCompleted * TOKENS_PER_REVIEW;
  const earnedTotal = STARTER_AI_MESSAGES + earnedFromReviews;
  const earnedUsed = Math.max(0, input.aiPromptsUsed);
  const earnedAvailable = Math.max(0, earnedTotal - earnedUsed);

  const usedDailyToday = input.aiDailyDate === localDateString(now);
  const dailyAvailable = usedDailyToday ? 0 : DAILY_FREE_MESSAGES;

  return {
    reviewsCompleted,
    starterMessages: STARTER_AI_MESSAGES,
    earnedFromReviews,
    earnedTotal,
    earnedUsed,
    earnedAvailable,
    dailyAvailable,
    totalAvailable: earnedAvailable + dailyAvailable,
    nextDailyResetAt: nextLocalMidnight(now).toISOString(),
  };
}

async function readUsage(userId: string) {
  const [reviewsCompleted, user] = await Promise.all([
    prisma.review.count({ where: { reviewerId: userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { aiPromptsUsed: true, aiDailyDate: true },
    }),
  ]);
  return {
    reviewsCompleted,
    aiPromptsUsed: user?.aiPromptsUsed ?? 0,
    aiDailyDate: user?.aiDailyDate ?? null,
  };
}

export async function getTokenStatus(userId: string): Promise<TokenStatus> {
  const u = await readUsage(userId);
  return computeTokenStatus(u);
}

// Spend one prompt. The free daily prompt is used first (it resets, so it is
// use-it-or-lose-it), preserving earned tokens. Throws NO_CREDITS when empty.
// Call only after a successful model response so failed requests never charge.
export async function consumeToken(userId: string): Promise<TokenStatus> {
  const u = await readUsage(userId);
  const status = computeTokenStatus(u);
  if (status.totalAvailable <= 0) {
    const err = new Error("NO_CREDITS") as Error & { status?: number };
    err.status = 402;
    throw err;
  }
  if (status.dailyAvailable > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { aiDailyDate: localDateString() },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { aiPromptsUsed: { increment: 1 } },
    });
  }
  return getTokenStatus(userId);
}

// ---------------------------------------------------------------------------
// 2. Groq model calls
// ---------------------------------------------------------------------------

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function groqComplete(opts: {
  model: string;
  messages: ChatMsg[];
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    const err = new Error(
      "Secretariat is not configured yet (missing GROQ_API_KEY)."
    ) as Error & { status?: number };
    err.status = 503;
    throw err;
  }
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      max_completion_tokens: opts.maxTokens ?? 4096,
      reasoning_effort: opts.reasoningEffort ?? "medium",
      stream: false,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Groq error", res.status, detail.slice(0, 500));
    const err = new Error(
      res.status === 429
        ? "Secretariat is busy right now. Try again in a moment."
        : "Secretariat could not complete that request."
    ) as Error & { status?: number };
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }
  const data = await res.json();
  const choice = data?.choices?.[0]?.message ?? {};
  const content = (choice.content ?? "").trim();
  // gpt-oss models sometimes leave content empty and put text in `reasoning`.
  return content || (choice.reasoning ?? "").trim();
}

// Small model: compress the user's question to save tokens while preserving
// every specific. Falls back to the original prompt on any failure.
export async function optimizePrompt(userPrompt: string): Promise<string> {
  try {
    const out = await groqComplete({
      model: AI_MODEL_SMALL,
      temperature: 0,
      maxTokens: 400,
      reasoningEffort: "low",
      messages: [
        {
          role: "system",
          content:
            "You rewrite a user's question about their academic paper to be as concise and token-efficient as possible while preserving ALL intent, specifics, constraints, and references. Do not answer it. Do not add new requests. Output ONLY the rewritten question, nothing else.",
        },
        { role: "user", content: userPrompt },
      ],
    });
    const cleaned = out.replace(/^["'\s]+|["'\s]+$/g, "");
    return cleaned.length >= 8 ? cleaned : userPrompt;
  } catch {
    return userPrompt;
  }
}

// Small model: derive a short chat title from the first prompt.
export async function nameChat(firstPrompt: string): Promise<string> {
  try {
    const out = await groqComplete({
      model: AI_MODEL_SMALL,
      temperature: 0.2,
      maxTokens: 30,
      reasoningEffort: "low",
      messages: [
        {
          role: "system",
          content:
            "Create a concise chat title (3-6 words, Title Case) summarizing the user's request about their paper. No quotes, no trailing punctuation, no emoji. Output ONLY the title.",
        },
        { role: "user", content: firstPrompt },
      ],
    });
    const title = out.replace(/^["'\s]+|["'\s]+$/g, "").replace(/[.]+$/, "");
    return title ? title.slice(0, 60) : "New chat";
  } catch {
    return "New chat";
  }
}

const MAIN_SYSTEM = [
  "You are Secretariat, an expert academic reviewer and writing mentor inside DocuPeer.",
  "You are given the full text of the user's uploaded paper, followed by their questions.",
  "Read the paper carefully and give specific, constructive, honest feedback grounded in the actual text — quote or reference concrete passages rather than speaking in generalities.",
  "",
  "FORMATTING (strict):",
  "- Respond in GitHub-Flavored Markdown.",
  "- Render ALL mathematical and scientific notation as LaTeX: inline math wrapped in $...$, and display equations wrapped in $$...$$ on their own lines. Never write math as plain text or Unicode symbols (use $\\alpha$, $x^2$, $\\frac{a}{b}$, $\\sum_{i=1}^{n}$, etc.).",
  "- Use headings, **bold**, bullet/numbered lists, and Markdown tables where they aid clarity.",
  "- Use fenced code blocks for any code.",
  "Be thorough and detailed, but stay focused on what the user actually asked.",
].join("\n");

export async function answerAboutPaper(input: {
  paperName: string;
  paperText: string;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): Promise<string> {
  const paper = input.paperText.slice(0, MAX_PAPER_CONTEXT_CHARS);
  const truncated = input.paperText.length > MAX_PAPER_CONTEXT_CHARS;
  const messages: ChatMsg[] = [
    { role: "system", content: MAIN_SYSTEM },
    {
      role: "system",
      content:
        `The user's paper is titled "${input.paperName}".\n` +
        `--- BEGIN PAPER ---\n${paper}\n--- END PAPER ---` +
        (truncated ? "\n[Note: the paper was truncated for length.]" : ""),
    },
    // Keep recent turns for continuity without blowing the context window.
    ...input.history.slice(-12),
    { role: "user", content: input.question },
  ];
  const out = await groqComplete({
    model: AI_MODEL_MAIN,
    temperature: 0.4,
    maxTokens: 6000,
    reasoningEffort: "medium",
    messages,
  });
  return out || "I wasn't able to generate a response. Please try again.";
}

// ---------------------------------------------------------------------------
// 3. Paper text extraction (PDF / DOCX)
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPaperText(
  filename: string,
  buffer: Buffer
): Promise<{ text: string; wordCount: number }> {
  const lower = filename.toLowerCase();
  let text = "";
  if (lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const res = await extractText(pdf, { mergePages: true });
    text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
  } else if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default ?? (await import("mammoth"));
    const res = await (mammoth as any).extractRawText({ buffer });
    text = res.value ?? "";
  } else {
    const err = new Error("Only PDF and DOCX files are accepted.") as Error & {
      status?: number;
    };
    err.status = 415;
    throw err;
  }
  text = normalize(text);
  const wordCount = text ? text.split(/\s+/).length : 0;
  return { text, wordCount };
}
