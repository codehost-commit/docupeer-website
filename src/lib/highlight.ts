// Pure helpers for the reviewing surface: converting DOM selections into
// character offsets against the canonical paper text, and splitting the text
// into renderable segments given a set of annotations.

import type { DraftAnnotation } from "./client";

// Sum the length of all text that appears before (node, offset) within
// `container`, giving the character index into the container's full text.
export function offsetWithinContainer(
  container: HTMLElement,
  node: Node,
  offset: number
): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += (current.textContent ?? "").length;
    current = walker.nextNode();
  }
  // If the node is an element (e.g. selection ended on a span boundary), fall
  // back to the accumulated total.
  return total;
}

export type Selection = { start: number; end: number; text: string };

// Read the current window selection relative to `container`. Returns null if
// there is no usable (non-empty) selection inside the container.
export function readSelection(
  container: HTMLElement,
  fullText: string
): Selection | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

  const range = sel.getRangeAt(0);
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  )
    return null;

  let start = offsetWithinContainer(container, range.startContainer, range.startOffset);
  let end = offsetWithinContainer(container, range.endContainer, range.endOffset);
  if (start > end) [start, end] = [end, start];
  if (end <= start) return null;

  return { start, end, text: fullText.slice(start, end) };
}

export type Segment = { text: string; ann: DraftAnnotation | null };

// Split fullText into an ordered list of segments. Annotated segments carry the
// annotation; overlapping annotations are resolved first-wins so rendering
// never breaks.
export function buildSegments(
  fullText: string,
  annotations: DraftAnnotation[]
): Segment[] {
  const sorted = [...annotations]
    .filter((a) => a.endOffset > a.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);

  const nonOverlapping: DraftAnnotation[] = [];
  let cursor = 0;
  for (const a of sorted) {
    if (a.startOffset >= cursor) {
      nonOverlapping.push(a);
      cursor = a.endOffset;
    }
  }

  const segments: Segment[] = [];
  let pos = 0;
  for (const a of nonOverlapping) {
    if (a.startOffset > pos)
      segments.push({ text: fullText.slice(pos, a.startOffset), ann: null });
    segments.push({ text: fullText.slice(a.startOffset, a.endOffset), ann: a });
    pos = a.endOffset;
  }
  if (pos < fullText.length) segments.push({ text: fullText.slice(pos), ann: null });
  return segments;
}

export function kindClass(kind: string): string {
  if (kind === "add") return "hl-add";
  if (kind === "remove") return "hl-remove";
  return "hl-comment";
}

export function kindLabel(kind: string): string {
  if (kind === "add") return "Suggest adding";
  if (kind === "remove") return "Suggest removing";
  return "Comment";
}
