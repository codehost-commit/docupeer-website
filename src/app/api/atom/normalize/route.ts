import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL_SMALL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
type NormalizeKind = "topic" | "title" | "period";

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function fallback(kind: NormalizeKind, value: string) {
  const compact = value.replace(/\s+/g, " ").replace(/[.!?]+$/g, "").trim();
  if (kind === "title") {
    const words = compact.split(" ").slice(0, 9);
    return words.map((word) => word ? word[0].toUpperCase() + word.slice(1) : word).join(" ");
  }
  if (kind === "period") {
    const match = compact.match(/\b(period|section|block)\s*[:#-]?\s*([a-z0-9-]+)\b/i);
    return match ? `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${match[2]}` : compact;
  }
  return compact.split(" ").slice(0, 10).join(" ");
}

function promptFor(kind: NormalizeKind, value: string) {
  if (kind === "topic") {
    return `Turn this teacher's topic into a short, clean topic label for a sidebar and PDF metadata. Keep the meaning. Use 2-8 words, title case, and no ending punctuation. Return JSON only: {"value":"..."}.\nInput: ${value}`;
  }
  if (kind === "title") {
    return `Create a polished assignment title from this topic. Use 2-8 words, title case, no colon, no quotation marks, no ending punctuation, and do not append the word Assignment. Return JSON only: {"value":"..."}.\nTopic: ${value}`;
  }
  return `Normalize this class period or section label. Return only the clean label in JSON as {"value":"..."}. Preserve a meaningful prefix such as Period, Section, or Block and its number/letter. Examples: "period 2" -> "Period 2", "Period: period 2" -> "Period 2", "block 4" -> "Block 4". Never repeat a prefix.\nInput: ${value}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind as NormalizeKind;
    const value = clean(body?.value, kind === "topic" ? 220 : kind === "title" ? 180 : 60);
    if (!(kind === "topic" || kind === "title" || kind === "period") || !value) {
      return NextResponse.json({ value: "" }, { status: 400 });
    }

    const key = process.env.GROQ_ATOM_API_KEY;
    if (!key) return NextResponse.json({ value: fallback(kind, value), fallback: true });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_MODEL_SMALL,
        messages: [
          { role: "system", content: "You clean and normalize short education labels. Return only valid JSON." },
          { role: "user", content: promptFor(kind, value) },
        ],
        temperature: 0.1,
        max_completion_tokens: 120,
        response_format: { type: "json_object" },
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) return NextResponse.json({ value: fallback(kind, value), fallback: true });
    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content ?? "").trim();
    const parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
    const normalized = clean(parsed?.value, kind === "topic" ? 90 : kind === "title" ? 120 : 60);
    return NextResponse.json({ value: normalized || fallback(kind, value) });
  } catch {
    const body = await req.clone().json().catch(() => ({}));
    const kind = body?.kind as NormalizeKind;
    const value = clean(body?.value, 220);
    return NextResponse.json({ value: fallback(kind, value), fallback: true });
  }
}
