// A lightweight, dependency-free heuristic AI-content detector.
//
// This is a stand-in so the product's screening flow works end-to-end without
// an external vendor. It is NOT a reliable detector and is deliberately
// conservative. It looks for stylistic markers that correlate with generic
// LLM output (boilerplate transition phrases, low lexical diversity, uniform
// sentence length, common AI hedging) and returns an estimated AI fraction.
//
// Replace this by implementing `AiDetector` with a real provider. see
// ./index.ts. The rest of the app never imports this class directly.

import type { AiDetector, AiDetectionResult } from "./index";

const AI_PHRASES = [
  "as an ai language model",
  "as a large language model",
  "it is important to note that",
  "it's important to note that",
  "it is worth noting that",
  "in conclusion,",
  "in summary,",
  "overall,",
  "furthermore,",
  "moreover,",
  "additionally,",
  "in today's fast-paced world",
  "in the realm of",
  "delve into",
  "delving into",
  "a testament to",
  "plays a crucial role",
  "plays a vital role",
  "it is essential to",
  "navigating the",
  "when it comes to",
  "on the other hand,",
  "as previously mentioned",
  "in this essay, i will",
  "this essay will explore",
  "firstly,",
  "secondly,",
  "lastly,",
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
}

export class HeuristicAiDetector implements AiDetector {
  readonly name = "heuristic";

  async detect(text: string): Promise<AiDetectionResult> {
    const clean = (text ?? "").trim();
    const words = tokenize(clean);
    const wordCount = words.length;

    if (wordCount < 12) {
      // Too little signal to flag; treat as human.
      return { score: 0, provider: this.name, detail: "too short to score" };
    }

    const lower = " " + clean.toLowerCase() + " ";

    // 1) Boilerplate phrase density.
    let phraseHits = 0;
    for (const p of AI_PHRASES) {
      const idx = lower.indexOf(p);
      if (idx !== -1) phraseHits += 1;
    }
    const phraseSignal = Math.min(1, phraseHits / 4); // 4+ phrases -> maxed

    // 2) Lexical diversity (type/token ratio). Low diversity -> more AI-like.
    const unique = new Set(words).size;
    const ttr = unique / wordCount;
    // Human casual writing typically 0.45-0.7 for short texts; very low is suspicious.
    const diversitySignal = ttr < 0.4 ? Math.min(1, (0.4 - ttr) / 0.2) : 0;

    // 3) Sentence-length uniformity. AI output tends toward even sentence lengths.
    const sentences = splitSentences(clean);
    let uniformitySignal = 0;
    if (sentences.length >= 4) {
      const lens = sentences.map((s) => tokenize(s).length).filter((n) => n > 0);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const variance =
        lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      // Low coefficient of variation => uniform => more AI-like.
      uniformitySignal = cv < 0.35 ? Math.min(1, (0.35 - cv) / 0.35) : 0;
    }

    // Weighted blend. Phrase density dominates because it is the clearest tell.
    const score =
      0.6 * phraseSignal + 0.25 * diversitySignal + 0.15 * uniformitySignal;

    const rounded = Math.max(0, Math.min(1, Number(score.toFixed(3))));

    return {
      score: rounded,
      provider: this.name,
      detail: `phrases=${phraseHits} ttr=${ttr.toFixed(2)}`,
    };
  }
}
