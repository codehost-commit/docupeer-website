// AI-content detection service.
//
// The rest of the application depends ONLY on the `AiDetector` interface and
// the `getAiDetector()` / `screenReview()` helpers below. never on a concrete
// provider. To swap in a real vendor (GPTZero, Originality.ai, an internal
// model, etc.), implement `AiDetector` and register it in `PROVIDERS`, then set
// AI_DETECTOR_PROVIDER in the environment. No call sites change.

import { HeuristicAiDetector } from "./heuristic-detector";

export type AiDetectionResult = {
  // Estimated fraction of the text that is AI-generated, 0..1.
  score: number;
  provider: string;
  // Optional human-readable detail for logging/debugging.
  detail?: string;
};

export interface AiDetector {
  readonly name: string;
  detect(text: string): Promise<AiDetectionResult>;
}

// Registry of available providers. Add new providers here.
const PROVIDERS: Record<string, () => AiDetector> = {
  heuristic: () => new HeuristicAiDetector(),
  // Example of how a future provider would slot in:
  // gptzero: () => new GptZeroDetector(process.env.GPTZERO_API_KEY!),
};

export function getAiDetector(): AiDetector {
  const key = (process.env.AI_DETECTOR_PROVIDER || "heuristic").toLowerCase();
  const factory = PROVIDERS[key] ?? PROVIDERS.heuristic;
  return factory();
}

// The blocking threshold is configuration, not code. change AI_CONTENT_THRESHOLD
// (0..1) in the environment to tune how strict screening is.
export function getAiThreshold(): number {
  const raw = Number(process.env.AI_CONTENT_THRESHOLD);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0.1;
  return raw;
}

export type ReviewScreenResult = {
  allowed: boolean;
  score: number;
  threshold: number;
  provider: string;
  detail?: string;
};

// Single entry point used by the review-submission path. Returns whether the
// review passes screening along with the score/threshold for auditing.
export async function screenReview(text: string): Promise<ReviewScreenResult> {
  const detector = getAiDetector();
  const threshold = getAiThreshold();
  const result = await detector.detect(text);
  return {
    allowed: result.score <= threshold,
    score: result.score,
    threshold,
    provider: result.provider,
    detail: result.detail,
  };
}
