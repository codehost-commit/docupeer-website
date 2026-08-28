"use client";

import { useState } from "react";

// A LaTeX-typeset sample paper, one page at a time. Left / right arrows step
// through pages; the pages behind are just a decorative fanned stack, they
// aren't interactive (so nothing spam-scrolls if the cursor hovers a corner).
//
// Annotations are rendered inline the way DocuPeer's review surface does:
//   - "add"     -> green tint + solid green underline (hl-add)
//   - "remove"  -> red tint + strikethrough (hl-remove)
//   - "comment" -> amber/yellow tint + amber underline (hl-comment)
//
// The body prose is written in the voice of an actual LaTeX manuscript:
// centered title, author line, italic abstract, numbered section headings,
// justified paragraphs with real inline math styled as italic CM-esque serif.

type Kind = "add" | "remove" | "comment";

// A run of body text. `k` tags the run as a review annotation.
type Run =
  | { t: string }
  | { t: string; k: Kind; note?: string };

type Section = { n: string; title: string; body: Run[][] };

type Page = {
  title: string;
  authors: string;
  affiliation: string;
  abstract?: string;
  sections: Section[];
};

const PAGES: Page[] = [
  {
    title: "On Reciprocal Peer Review in Small Writing Communities",
    authors: "A. Reviewer¹",
    affiliation: "¹DocuPeer Working Papers",
    abstract:
      "We describe a peer-review model in which every reviewer is also a writer, and every writer must earn feedback by giving it. In a three-month pilot with n = 184 papers and n′ = 412 reviews we show that reciprocity produces feedback that authors rate 0.7 points higher on a five-point scale than feedback from non-writing reviewers.",
    sections: [
      {
        n: "1",
        title: "Introduction",
        body: [
          [
            { t: "The exchange of thoughtful, subject-matter feedback " },
            { t: "has long been treated as a scarce resource", k: "comment", note: "Cite source?" },
            { t: ", controlled by the boundaries of institutions and the availability of senior reviewers. In this paper we describe a reciprocal model in which every reviewer is also a writer, and every writer must earn feedback by giving it." },
          ],
          [
            { t: "We argue that the resulting community is not merely fairer but produces substantively better commentary. " },
            { t: "Prior work in scholarly communication [1, 3, 7] has largely assumed a fixed pool of expert reviewers;", k: "add", note: "Add this framing" },
            { t: " our contribution is to relax that assumption." },
          ],
          [
            { t: "The remainder of this paper is organised as follows. Section 2 describes the matching function used to pair a submission with two independent reviewers. Section 3 describes the anonymity model. " },
            { t: "Section 4 reports empirical results from the three-month pilot, which we will discuss at length below.", k: "remove", note: "Cut, redundant" },
          ],
        ],
      },
    ],
  },
  {
    title: "On Reciprocal Peer Review in Small Writing Communities",
    authors: "A. Reviewer¹",
    affiliation: "¹DocuPeer Working Papers",
    sections: [
      {
        n: "2",
        title: "Matching Reviewers to Papers",
        body: [
          [
            { t: "Let R be the set of registered reviewers, each described by a " },
            { t: "self-declared specialty sᵣ", k: "comment", note: "Define index r" },
            { t: " and an education level ℓᵣ ∈ {1, …, 6}. Each paper p carries a specialty sₚ and a target level ℓₚ." },
          ],
          [
            { t: "We define an eligibility set E(p) = { r ∈ R : sᵣ = sₚ ∧ |ℓᵣ − ℓₚ| ≤ 1 } and rank its members by the least-recent review timestamp, so that no single reviewer is repeatedly asked. " },
            { t: "In practice the timestamp is stored per-reviewer and updated atomically when a review is completed.", k: "add", note: "Useful implementation note" },
          ],
          [
            { t: "The two highest-ranked reviewers in E(p) are notified. If one declines, the next in the ranking is offered the paper. " },
            { t: "This scheme is trivial to reason about and easy to implement.", k: "remove", note: "Editorialising, drop" },
          ],
        ],
      },
    ],
  },
  {
    title: "On Reciprocal Peer Review in Small Writing Communities",
    authors: "A. Reviewer¹",
    affiliation: "¹DocuPeer Working Papers",
    sections: [
      {
        n: "3",
        title: "Anonymity Guarantees",
        body: [
          [
            { t: "Reviewer identities are hidden from authors, and author identities are hidden from reviewers. Names, email addresses, and institutional affiliations are never surfaced through the review interface. " },
            { t: "This is not merely a preference; it is a load-bearing property of the system.", k: "comment", note: "Nice phrasing" },
          ],
          [
            { t: "Instead, each reviewer is shown a stable pseudonymous handle for the duration of a paper, so a paper’s author may address feedback from ‘Reviewer 1’ or ‘Reviewer 2’ without ever learning who they are." },
          ],
          [
            { t: "We consider this asymmetry essential. Anonymity frees the reviewer to be candid; " },
            { t: "it also protects the writer from being judged by their name rather than their argument.", k: "add", note: "Restate in abstract too" },
          ],
        ],
      },
    ],
  },
  {
    title: "On Reciprocal Peer Review in Small Writing Communities",
    authors: "A. Reviewer¹",
    affiliation: "¹DocuPeer Working Papers",
    sections: [
      {
        n: "4",
        title: "Empirical Notes",
        body: [
          [
            { t: "During a three-month pilot, participants submitted n = 184 papers and completed n′ = 412 reviews. The mean review length was 327 words, comfortably above the platform minimum of 200 words." },
          ],
          [
            { t: "Reviewers who had themselves recently submitted a paper produced feedback that authors rated, on a five-point scale, at " },
            { t: "4.1 ± 0.7", k: "comment", note: "Include CI" },
            { t: ", compared with 3.4 ± 0.9 from reviewers who had never submitted." },
          ],
          [
            { t: "The difference is not merely one of effort. " },
            { t: "Writers who have recently exposed their own work to critique appear to write kinder, more useful reviews.", k: "add", note: "Beautiful, keep" },
            { t: " We return to this point in Section 5." },
          ],
        ],
      },
    ],
  },
];

// Render a single body run, dispatching on annotation kind. The colours match
// /src/app/globals.css's .hl-add / .hl-remove / .hl-comment classes exactly.
function RunSpan({ run }: { run: Run }) {
  if (!("k" in run)) return <>{run.t}</>;
  const cls =
    run.k === "add"
      ? "bg-emerald-500/15 shadow-[inset_0_-2px_0_0_rgba(52,131,72,0.85)]"
      : run.k === "remove"
      ? "bg-rose-500/15 shadow-[inset_0_-2px_0_0_rgba(179,69,94,0.85)] line-through decoration-rose-600/70"
      : "bg-amber-400/20 shadow-[inset_0_-2px_0_0_rgba(168,119,23,0.85)]";
  return (
    <span
      className={`relative rounded-[2px] px-[2px] py-[1px] ${cls}`}
      title={run.note ?? undefined}
    >
      {run.t}
    </span>
  );
}

// A single manuscript page rendered in a LaTeX-manuscript style.
// pageNumber is 1-indexed for display, isFirstPage controls whether the
// title/author/abstract block is shown (only on the opening page).
function PageContent({
  page,
  pageNumber,
  totalPages,
  isFirstPage,
}: {
  page: Page;
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
}) {
  return (
    <div className="latex-page relative flex h-full w-full flex-col bg-[#fbf9f2] px-10 py-10 sm:px-14 sm:py-12">
      {/* Running header slug — the short title on continuation pages, per
          LaTeX manuscript convention. */}
      <div className="mb-6 flex items-baseline justify-between border-b border-black/10 pb-2 font-serif text-[9.5px] uppercase tracking-[0.32em] text-black/45">
        <span>
          {isFirstPage
            ? "DocuPeer Working Papers · Vol. 1"
            : "Reciprocal Peer Review · DocuPeer"}
        </span>
        <span className="tabular-nums">2026-08-18</span>
      </div>

      {/* Title block (first page only) */}
      {isFirstPage && (
        <div className="text-center">
          <h3 className="font-serif text-[19px] font-semibold leading-tight text-black/85 sm:text-[21px]">
            {page.title}
          </h3>
          <p className="mt-3 font-serif text-[12.5px] italic text-black/70">
            {page.authors}
          </p>
          <p className="font-serif text-[10.5px] italic text-black/50">
            {page.affiliation}
          </p>
        </div>
      )}

      {/* Abstract (first page only) */}
      {isFirstPage && page.abstract && (
        <div className="mx-auto mt-6 max-w-[92%]">
          <p className="text-center font-serif text-[11px] font-semibold uppercase tracking-[0.28em] text-black/60">
            Abstract
          </p>
          <p className="mt-2 text-justify font-serif text-[12px] italic leading-[1.55] text-black/75 hyphens-auto">
            {page.abstract}
          </p>
          <div className="mx-auto mt-4 h-px w-16 bg-black/15" />
        </div>
      )}

      {/* Sections */}
      <div className={isFirstPage ? "mt-6 space-y-5" : "mt-2 space-y-5"}>
        {page.sections.map((s) => (
          <div key={s.n}>
            <h4 className="font-serif text-[13.5px] font-semibold text-black/85">
              <span className="mr-2 tabular-nums text-black/60">{s.n}</span>
              {s.title}
            </h4>
            <div className="mt-2 space-y-2.5 font-serif text-[13px] leading-[1.65] text-black/85">
              {s.body.map((para, i) => (
                <p
                  key={i}
                  className="text-justify hyphens-auto"
                  style={{ textIndent: i === 0 ? 0 : "1.6em" }}
                >
                  {para.map((run, j) => (
                    <RunSpan key={j} run={run} />
                  ))}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-3 font-serif text-[10px] italic text-black/45">
        <span>Anonymous manuscript</span>
        <span className="tabular-nums">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
}

export function PaperStack() {
  const [i, setI] = useState(0);
  const n = PAGES.length;
  const go = (delta: number) => setI((v) => (v + delta + n) % n);

  return (
    <div className="relative mx-auto w-full max-w-[560px] select-none">
      {/* Caption row above the stack */}
      <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-deep-dim">
        <span>Sample manuscript</span>
        <span className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/70" />
            add
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-rose-500/70" />
            remove
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-amber-400/80" />
            comment
          </span>
        </span>
      </div>

      {/* The stack itself. Only the front page is interactive; the two behind
          it are pure decoration with pointer-events disabled so hovering the
          corner never re-triggers any state. */}
      <div className="relative" style={{ aspectRatio: "3 / 4" }}>
        {/* Back page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-top-left rounded-[10px] border border-black/10 bg-white shadow-[0_18px_40px_-24px_rgba(15,32,50,0.35)]"
          style={{
            transform: "translate3d(30px, 34px, 0) rotate(2.4deg) scale(0.94)",
            opacity: 0.55,
          }}
        />
        {/* Middle page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-top-left rounded-[10px] border border-black/10 bg-white shadow-[0_18px_40px_-24px_rgba(15,32,50,0.35)]"
          style={{
            transform: "translate3d(15px, 17px, 0) rotate(1.2deg) scale(0.97)",
            opacity: 0.8,
          }}
        />
        {/* Front page — the actual content */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_24px_50px_-24px_rgba(15,32,50,0.4),0_2px_6px_-3px_rgba(15,32,50,0.2)]"
        >
          <PageContent
            page={PAGES[i]}
            pageNumber={i + 1}
            totalPages={PAGES.length}
            isFirstPage={i === 0}
          />
        </div>
      </div>

      {/* Controls: prev, dots, next */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-full border border-deep-border bg-deep-panel text-deep-text-soft transition hover:border-deep-accent hover:text-deep-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {PAGES.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Go to page ${k + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                k === i ? "w-8 bg-deep-accent" : "w-2 bg-deep-border hover:bg-deep-dim"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-full border border-deep-border bg-deep-panel text-deep-text-soft transition hover:border-deep-accent hover:text-deep-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
