// User-generated content is stored as plain text and rendered as text (never
// via dangerouslySetInnerHTML). This helper is a defense-in-depth normalizer:
// it strips control characters so stored content stays clean. Rendering as
// React text already prevents markup injection.

// ASCII/C1 control chars except tab (0x09) and newline (0x0A).
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

export function sanitizeText(input: unknown, maxLen = 50_000): string {
  const raw = typeof input === "string" ? input : "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(CONTROL_CHARS, "")
    .slice(0, maxLen);
}

// For short single-line fields (titles, specialty, names).
export function sanitizeLine(input: unknown, maxLen = 300): string {
  return sanitizeText(input, maxLen).replace(/\n+/g, " ").trim();
}
