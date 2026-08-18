"use client";

import { useEffect, useMemo, useState } from "react";

// A stack of paper pages that shifts on hover. The topmost page is fully
// visible; each page behind is offset a little down-and-right. Hovering any
// page behind promotes it to the front. Annotations (add / remove / comment)
// float in the margin of the top page.

type Annotation = {
  kind: "add" | "remove" | "comment";
  y: number;         // percentage down the page where the pin sits
  label: string;     // the tiny caption shown next to the pin
  quote: string;     // the text fragment the annotation refers to
  side: "left" | "right";
};

type Page = {
  title: string;      // rendered in the page header
  section: string;    // e.g. "Introduction", "Methods"
  bodyLatex: string[]; // plain LaTeX-ish paragraphs
  annotations: Annotation[];
};

const PAGES: Page[] = [
  {
    title: "On Reciprocal Peer Review",
    section: "1. Introduction",
    bodyLatex: [
      "The exchange of thoughtful, subject-matter feedback has long been treated as a scarce resource, controlled by the boundaries of institutions and the availability of senior reviewers.",
      "In this paper we describe a reciprocal model in which every reviewer is also a writer, and every writer must earn feedback by giving it. We argue that the resulting community is not merely fairer but produces substantively better commentary.",
      "The remainder of this paper is organised as follows. Section~\\ref{sec:matching} describes the matching function used to pair a submission with two independent reviewers.",
    ],
    annotations: [
      { kind: "comment", y: 22, side: "right", label: "Reviewer note", quote: "the exchange of thoughtful, subject-matter feedback" },
      { kind: "add",     y: 54, side: "left",  label: "Suggest add",   quote: "reviewer is also a writer" },
      { kind: "remove",  y: 78, side: "right", label: "Consider cut",  quote: "The remainder of this paper" },
    ],
  },
  {
    title: "Matching Reviewers to Papers",
    section: "2. Method",
    bodyLatex: [
      "Let $R$ be the set of registered reviewers, each described by a self-declared specialty $s_r$ and an education level $\\ell_r \\in \\{1, \\dots, 6\\}$. Each paper $p$ carries a specialty $s_p$ and a target level $\\ell_p$.",
      "We define an eligibility set $E(p) = \\{ r \\in R : s_r = s_p \\land |\\ell_r - \\ell_p| \\leq 1 \\}$ and rank its members by the least-recent review timestamp, so that no single reviewer is repeatedly asked.",
      "The two highest-ranked reviewers in $E(p)$ are notified; if one declines, the next in the ranking is offered the paper.",
    ],
    annotations: [
      { kind: "comment", y: 30, side: "right", label: "Clarify",       quote: "self-declared specialty" },
      { kind: "add",     y: 62, side: "left",  label: "Add example",   quote: "eligibility set" },
    ],
  },
  {
    title: "Anonymity Guarantees",
    section: "3. Privacy Model",
    bodyLatex: [
      "Reviewer identities are hidden from authors, and author identities are hidden from reviewers. Names, email addresses, and institutional affiliations are never surfaced through the review interface.",
      "Instead, each reviewer is shown a stable pseudonymous handle for the duration of a paper, so a paper's author may address feedback from ``Reviewer~1'' or ``Reviewer~2'' without ever learning who they are.",
      "We consider this asymmetry essential. Anonymity frees the reviewer to be candid; it also protects the writer from being judged by their name rather than their argument.",
    ],
    annotations: [
      { kind: "remove",  y: 26, side: "left",  label: "Rephrase",      quote: "Reviewer identities are hidden" },
      { kind: "comment", y: 72, side: "right", label: "Strong claim",  quote: "essential" },
    ],
  },
  {
    title: "Empirical Notes",
    section: "4. Discussion",
    bodyLatex: [
      "During a three-month pilot, participants submitted $n = 184$ papers and completed $n' = 412$ reviews. The mean review length was $327$ words, comfortably above the platform minimum of $200$.",
      "Reviewers who had themselves recently submitted a paper produced feedback that authors rated, on a five-point scale, at $4.1 \\pm 0.7$, compared with $3.4 \\pm 0.9$ from reviewers who had never submitted.",
      "The difference is not merely one of effort. Writers who have recently exposed their own work to critique appear to write kinder, more useful reviews.",
    ],
    annotations: [
      { kind: "add",     y: 40, side: "right", label: "Add citation",  quote: "$4.1 \\pm 0.7$" },
      { kind: "comment", y: 84, side: "left",  label: "Nice framing",  quote: "kinder, more useful reviews" },
    ],
  },
];

function KindIcon({ kind, className = "" }: { kind: Annotation["kind"]; className?: string }) {
  if (kind === "add") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "remove") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M4 5h16v11H8l-4 4V5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function kindColor(kind: Annotation["kind"]) {
  switch (kind) {
    case "add":
      return "text-emerald-700 bg-emerald-100/80 border-emerald-300/70";
    case "remove":
      return "text-rose-700 bg-rose-100/80 border-rose-300/70";
    case "comment":
      return "text-deep-accent bg-deep-accent/10 border-deep-accent/30";
  }
}

// A single page rendered as if it were a printed manuscript.
function PageCard({
  page,
  showAnnotations,
}: {
  page: Page;
  showAnnotations: boolean;
}) {
  return (
    <div className="relative flex h-full w-full flex-col bg-[#fdfbf5] px-8 py-9 sm:px-12 sm:py-11">
      {/* Page header */}
      <div className="mb-6 flex items-baseline justify-between border-b border-black/10 pb-3">
        <div className="serif text-[11px] uppercase tracking-[0.28em] text-black/50">
          docupeer &nbsp;/&nbsp; anonymous manuscript
        </div>
        <div className="serif text-[11px] tabular-nums text-black/40">
          {page.section}
        </div>
      </div>

      {/* Title */}
      <h3 className="serif text-2xl leading-snug text-black/90 sm:text-3xl">
        {page.title}
      </h3>
      <p className="serif mt-1 text-[13px] italic text-black/50">
        Rahul Awasthi &middot; Aryan Patel &middot; DocuPeer Working Papers
      </p>

      {/* Body — LaTeX-style justified paragraphs */}
      <div className="serif mt-6 space-y-3 text-[13.5px] leading-[1.65] text-black/80 sm:text-[14.5px]">
        {page.bodyLatex.map((para, i) => (
          <p key={i} className="text-justify hyphens-auto">
            {renderInlineLatex(para)}
          </p>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-3 text-[10px] uppercase tracking-[0.26em] text-black/40">
        <span>docupeer.org</span>
        <span className="tabular-nums">Page 1 of 12</span>
      </div>

      {/* Annotation pins */}
      {showAnnotations &&
        page.annotations.map((a, i) => (
          <AnnotationPin key={i} annotation={a} />
        ))}
    </div>
  );
}

// A margin annotation, pinned by absolute position.
function AnnotationPin({ annotation }: { annotation: Annotation }) {
  const side = annotation.side;
  return (
    <div
      className={`pointer-events-none absolute z-10 flex items-center gap-2 ${
        side === "left" ? "-left-3 sm:-left-6" : "-right-3 sm:-right-6"
      }`}
      style={{ top: `${annotation.y}%` }}
    >
      {side === "right" && (
        <div className="hidden max-w-[9rem] rounded-md border border-black/10 bg-white/95 px-2 py-1 shadow-sm sm:block">
          <div className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${
            annotation.kind === "add"
              ? "text-emerald-700"
              : annotation.kind === "remove"
              ? "text-rose-700"
              : "text-deep-accent"
          }`}>
            {annotation.label}
          </div>
          <div className="serif mt-0.5 truncate text-[11px] italic text-black/60">
            &ldquo;{stripLatex(annotation.quote)}&rdquo;
          </div>
        </div>
      )}
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${kindColor(
          annotation.kind
        )} shadow-sm`}
      >
        <KindIcon kind={annotation.kind} className="h-3.5 w-3.5" />
      </div>
      {side === "left" && (
        <div className="hidden max-w-[9rem] rounded-md border border-black/10 bg-white/95 px-2 py-1 shadow-sm sm:block">
          <div className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${
            annotation.kind === "add"
              ? "text-emerald-700"
              : annotation.kind === "remove"
              ? "text-rose-700"
              : "text-deep-accent"
          }`}>
            {annotation.label}
          </div>
          <div className="serif mt-0.5 truncate text-[11px] italic text-black/60">
            &ldquo;{stripLatex(annotation.quote)}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal inline LaTeX rendering — $..$ becomes an italic serif span,
// \ref{..} becomes a small blue reference, and \\{cmd} is passed through.
function renderInlineLatex(text: string) {
  const parts: (string | React.ReactNode)[] = [];
  const re = /\$([^$]+)\$|\\ref\{([^}]+)\}|``([^']+)''/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(
        <span key={key++} className="italic tracking-tight text-black/85">
          {m[1].replace(/\\ell/g, "ℓ").replace(/\\pm/g, "±").replace(/\\dots/g, "…").replace(/\\{|\\}/g, "")}
        </span>
      );
    } else if (m[2] !== undefined) {
      parts.push(
        <span key={key++} className="text-deep-accent">
          §{m[2].split(":")[1] ?? m[2]}
        </span>
      );
    } else if (m[3] !== undefined) {
      parts.push(
        <span key={key++} className="serif italic">
          &ldquo;{m[3]}&rdquo;
        </span>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function stripLatex(s: string) {
  return s
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\ref\{[^}]+\}/g, "")
    .replace(/``|''/g, "");
}

export function PaperStack() {
  const [front, setFront] = useState(0);
  // A tiny periodic nudge that briefly promotes the next page, so a visitor
  // who never moves their cursor still sees the effect.
  const [autoTick, setAutoTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setAutoTick((t) => t + 1), 4200);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (autoTick === 0) return;
    setFront((f) => (f + 1) % PAGES.length);
  }, [autoTick]);

  // Order the pages so the "front" one renders last (on top).
  const ordered = useMemo(() => {
    const n = PAGES.length;
    // Stack order from back to front, starting from front+1 wrap-around.
    return Array.from({ length: n }, (_, i) => (front + 1 + i) % n).map(
      (idx, i) => ({ idx, stackPosition: i }) // stackPosition 0 = deepest
    );
  }, [front]);

  return (
    <div className="relative mx-auto w-full max-w-[540px] select-none">
      {/* A little caption above the stack, mirroring the DocuScan pattern. */}
      <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-deep-dim">
        <span>Sample manuscript</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-deep-accent" />
          Hover a page to bring it forward
        </span>
      </div>

      <div
        className="relative"
        style={{ perspective: "1600px", aspectRatio: "3 / 4" }}
      >
        {ordered.map(({ idx, stackPosition }) => {
          const isFront = idx === front;
          const depth = ordered.length - 1 - stackPosition; // 0 = front, larger = deeper
          const translateX = depth * 22;      // px offset right
          const translateY = depth * 26;      // px offset down
          const scale = 1 - depth * 0.035;
          const rotate = depth * 1.4;         // slight fanning
          return (
            <button
              type="button"
              key={idx}
              onMouseEnter={() => setFront(idx)}
              onFocus={() => setFront(idx)}
              onClick={() => setFront(idx)}
              aria-label={`Show page: ${PAGES[idx].title}`}
              className="absolute inset-0 origin-top-left cursor-pointer overflow-hidden rounded-[10px] border border-black/10 bg-white text-left shadow-[0_18px_40px_-20px_rgba(15,32,50,0.35),0_2px_6px_-3px_rgba(15,32,50,0.2)] transition-[transform,box-shadow,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-accent"
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotate}deg) scale(${scale})`,
                zIndex: 10 + stackPosition,
                opacity: isFront ? 1 : 0.94 - depth * 0.06,
                filter: isFront ? "none" : `blur(${Math.min(depth * 0.6, 1.8)}px)`,
              }}
            >
              <PageCard page={PAGES[idx]} showAnnotations={isFront} />
            </button>
          );
        })}
      </div>

      {/* Dots — matches the small dot navigation Docuscan uses. */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {PAGES.map((p, i) => (
          <button
            key={p.title}
            type="button"
            onClick={() => setFront(i)}
            aria-label={`Show ${p.title}`}
            className={`h-1.5 rounded-full transition-all ${
              i === front
                ? "w-8 bg-deep-accent"
                : "w-2 bg-deep-border hover:bg-deep-dim"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
