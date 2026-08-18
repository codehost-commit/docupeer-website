"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiGet,
  apiPost,
  clearDraft,
  draftHasContent,
  loadDraft,
  saveDraft,
  type DraftAnnotation,
} from "@/lib/client";
import {
  buildSegments,
  kindClass,
  kindLabel,
  readSelection,
  type Selection,
} from "@/lib/highlight";
import { educationLabel } from "@/lib/constants";
import { ConfirmModal } from "../components/ConfirmModal";

type AnonPaper = {
  id: string;
  title: string;
  category: string;
  specialty: string;
  educationLevel: string;
  paperType: string;
  feedbackWanted: string | null;
  text: string;
  wordCount: number;
  matchScore: number | null;
};

const KIND_OPTIONS: {
  value: DraftAnnotation["kind"];
  label: string;
  hint: string;
}[] = [
  { value: "comment", label: "Comment", hint: "Explain or ask about this passage" },
  { value: "add", label: "Suggest adding", hint: "Something should be added here" },
  { value: "remove", label: "Suggest removing", hint: "This could be cut" },
];

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function ReviewInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [paper, setPaper] = useState<AnonPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [comment, setComment] = useState("");
  const [annotations, setAnnotations] = useState<DraftAnnotation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [pending, setPending] = useState<Selection | null>(null);
  const [pendKind, setPendKind] = useState<DraftAnnotation["kind"]>("comment");
  const [pendBody, setPendBody] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [aiBlocked, setAiBlocked] = useState<{
    score: number;
    threshold: number;
  } | null>(null);
  const [done, setDone] = useState(false);

  const [randomizeModal, setRandomizeModal] = useState(false);

  const proseRef = useRef<HTMLDivElement | null>(null);
  const restoredForPaper = useRef<string | null>(null);

  const hasContent = comment.trim().length > 0 || annotations.length > 0;

  const loadPaperById = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError("");
    try {
      const { paper } = await apiGet<{ paper: AnonPaper }>(`/api/papers/${id}`);
      setPaper(paper);
    } catch (err: any) {
      if (err?.data?.code === "OWN_PAPER") {
        setLoadError("You cannot review your own paper. Try another one.");
        setPaper(null);
      } else {
        setLoadError(err?.message || "Could not load that paper.");
        setPaper(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRandom = useCallback(
    async (excludeId?: string) => {
      setLoading(true);
      setLoadError("");
      setDone(false);
      setSubmitError("");
      setAiBlocked(null);
      try {
        const q = excludeId ? `?exclude=${encodeURIComponent(excludeId)}` : "";
        const { paper } = await apiGet<{ paper: AnonPaper | null }>(
          `/api/papers/random${q}`
        );
        if (!paper) {
          setPaper(null);
          setLoadError(
            "No papers are available to review right now. Check back soon."
          );
        } else {
          setPaper(paper);
          router.replace(`/review?paper=${paper.id}`);
        }
      } catch (err: any) {
        setLoadError(err?.message || "Could not load a paper.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const pid = params.get("paper");
    if (pid) loadPaperById(pid);
    else loadRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!paper) return;
    if (restoredForPaper.current === paper.id) return;
    restoredForPaper.current = paper.id;
    const draft = loadDraft(paper.id);
    if (draftHasContent(draft)) {
      setComment(draft!.comment);
      setAnnotations(draft!.annotations);
    } else {
      setComment("");
      setAnnotations([]);
    }
    setActiveId(null);
    setDone(false);
  }, [paper]);

  useEffect(() => {
    if (!paper) return;
    if (hasContent) {
      saveDraft({
        paperId: paper.id,
        comment,
        annotations,
        updatedAt: Date.now(),
      });
    }
  }, [paper, comment, annotations, hasContent]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (hasContent && !done) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasContent, done]);

  function onMouseUp() {
    if (!proseRef.current || !paper) return;
    const sel = readSelection(proseRef.current, paper.text);
    if (sel && sel.text.trim().length > 0) {
      setPending(sel);
      setPendKind("comment");
      setPendBody("");
    }
  }

  function confirmAnnotation() {
    if (!pending) return;
    if (pendKind !== "remove" && pendBody.trim().length === 0) return;
    const ann: DraftAnnotation = {
      id: newId(),
      startOffset: pending.start,
      endOffset: pending.end,
      quotedText: pending.text,
      kind: pendKind,
      body: pendBody.trim(),
    };
    setAnnotations((a) =>
      [...a, ann].sort((x, y) => x.startOffset - y.startOffset)
    );
    setPending(null);
    setPendBody("");
    window.getSelection()?.removeAllRanges();
  }

  function removeAnnotation(id: string) {
    setAnnotations((a) => a.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  }

  const segments = useMemo(
    () => (paper ? buildSegments(paper.text, annotations) : []),
    [paper, annotations]
  );

  async function doSubmit() {
    if (!paper) return;
    setSubmitError("");
    setAiBlocked(null);

    if (!hasContent) {
      setSubmitError(
        "Add a comment or at least one highlight before submitting."
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/reviews", {
        paperId: paper.id,
        comment,
        annotations: annotations.map((a) => ({
          startOffset: a.startOffset,
          endOffset: a.endOffset,
          quotedText: a.quotedText,
          kind: a.kind,
          body: a.body,
        })),
      });
      clearDraft(paper.id);
      setDone(true);
    } catch (err: any) {
      const status = err?.status;
      const code = err?.data?.code;
      if (status === 401) {
        saveDraft({
          paperId: paper.id,
          comment,
          annotations,
          updatedAt: Date.now(),
        });
        const next = encodeURIComponent(`/review?paper=${paper.id}`);
        router.push(`/login?next=${next}`);
        return;
      }
      if (code === "AI_CONTENT") {
        setAiBlocked({ score: err.data.aiScore, threshold: err.data.threshold });
      } else if (err?.data?.errors?.comment) {
        setSubmitError(err.data.errors.comment);
      } else {
        setSubmitError(err?.message || "Could not submit your review.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onRandomizeClick() {
    if (hasContent && !done) setRandomizeModal(true);
    else loadRandom(paper?.id);
  }
  function discardAndRandomize() {
    if (paper) clearDraft(paper.id);
    setComment("");
    setAnnotations([]);
    setRandomizeModal(false);
    loadRandom(paper?.id);
  }

  if (loading) {
    return (
      <div className="mono mx-auto max-w-3xl px-4 py-20 text-center text-xs uppercase tracking-widest text-deep-dim">
        Finding a paper.
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold text-deep-text">
          {loadError || "No paper available."}
        </p>
        <button className="btn-secondary mt-5" onClick={() => loadRandom()}>
          Try another paper
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{paper.category}</span>
          <span className="chip">{paper.specialty}</span>
          <span className="chip">{educationLabel(paper.educationLevel)}</span>
          <span className="chip">{paper.paperType}</span>
          {paper.matchScore != null && (
            <span className="chip-accent mono">
              Match {paper.matchScore}
            </span>
          )}
        </div>
        <button onClick={onRandomizeClick} className="btn-primary">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M4 4h4l12 16h0M20 4h-4L4 20"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3l4 1-1 4M16 21l4-1-1-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Randomize
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Reading + annotate column */}
        <div className="reading-col">
          <article className="card p-6 sm:p-8">
            <div className="mono mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-deep-dim">
              Anonymous submission . {paper.wordCount} words
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-deep-text sm:text-3xl">
              {paper.title}
            </h1>

            {paper.feedbackWanted && (
              <div className="mt-4 rounded-md border border-deep-accent/30 bg-deep-accent/10 px-4 py-3 text-sm text-deep-accent">
                <span className="mono text-[10px] font-semibold uppercase tracking-[0.14em]">
                  Author is hoping for
                </span>
                <p className="mt-1 text-deep-text">{paper.feedbackWanted}</p>
              </div>
            )}

            <p className="mono mt-5 text-[10px] uppercase tracking-[0.14em] text-deep-dim">
              Select any text below to comment, suggest an addition, or suggest a removal.
            </p>

            <div
              ref={proseRef}
              onMouseUp={onMouseUp}
              className="paper-prose mt-3 max-w-reading select-text"
            >
              {segments.map((seg, i) =>
                seg.ann ? (
                  <mark
                    key={i}
                    className={`${kindClass(seg.ann.kind)} ${
                      activeId === seg.ann.id ? "hl-active" : ""
                    } cursor-pointer rounded-sm`}
                    onClick={() => setActiveId(seg.ann!.id)}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </div>
          </article>
        </div>

        {/* Review panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <div className="italic text-sm text-deep-dim">
              Your review
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-deep-text">
                  Highlights <span className="mono text-deep-dim">({annotations.length})</span>
                </span>
              </div>
              {annotations.length === 0 ? (
                <p className="rounded-md border border-dashed border-deep-border px-3 py-4 text-center text-xs text-deep-dim">
                  Select text in the paper to add a highlighted suggestion.
                </p>
              ) : (
                <ul className="space-y-2">
                  {annotations.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-md border p-2.5 text-sm transition ${
                        activeId === a.id
                          ? "border-deep-accent/60 bg-deep-accent/5"
                          : "border-deep-border bg-deep-panel2"
                      }`}
                      onMouseEnter={() => setActiveId(a.id)}
                      onMouseLeave={() => setActiveId(null)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`mono text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            a.kind === "add"
                              ? "text-deep-good"
                              : a.kind === "remove"
                                ? "text-deep-bad"
                                : "text-deep-warn"
                          }`}
                        >
                          {kindLabel(a.kind)}
                        </span>
                        <button
                          onClick={() => removeAnnotation(a.id)}
                          className="italic text-sm text-deep-dim hover:text-deep-bad"
                          aria-label="Delete highlight"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 border-l-2 border-deep-border pl-2 text-xs italic text-deep-dim">
                        &quot;{a.quotedText}&quot;
                      </p>
                      {a.body && (
                        <p className="mt-1 text-sm text-deep-text">{a.body}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <label className="label">Overall feedback</label>
              <textarea
                className="input min-h-[120px] resize-y"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What worked well? What would make this stronger? Be specific and constructive."
              />
            </div>

            {aiBlocked && (
              <div className="mt-3 rounded-md border border-deep-warn/40 bg-deep-warn/10 px-3 py-2.5 text-xs text-deep-warn">
                This review looks like it may contain more than{" "}
                {Math.round(aiBlocked.threshold * 100)}% AI-generated content
                and was blocked. Please write your feedback in your own words.
              </div>
            )}
            {submitError && (
              <div className="mt-3 rounded-md border border-deep-bad/40 bg-deep-bad/10 px-3 py-2.5 text-xs text-deep-bad">
                {submitError}
              </div>
            )}

            {done ? (
              <div className="mt-4 rounded-md border border-deep-good/40 bg-deep-good/10 px-4 py-3 text-sm text-deep-good">
                <p className="font-semibold">Review submitted. Thank you.</p>
                <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.14em]">
                  Counts toward your next submission.
                </p>
                <button
                  className="btn-primary mt-3 w-full"
                  onClick={() => loadRandom(paper.id)}
                >
                  Review another paper
                </button>
              </div>
            ) : (
              <button
                className="btn-primary mt-4 w-full py-3"
                onClick={doSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting." : "Submit review"}
              </button>
            )}

            <p className="mono mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-deep-dim">
              Peer review. No grades. Just helpful feedback.
            </p>
          </div>
        </aside>
      </div>

      {/* Annotation popover */}
      {pending && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-deep-text/40 p-4 backdrop-blur-sm"
          onClick={() => setPending(null)}
        >
          <div
            className="card w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="italic text-sm text-deep-dim">
              Add a suggestion
            </div>
            <p className="mt-2 max-h-24 overflow-auto rounded-md border border-deep-border bg-deep-panel2 px-3 py-2 text-xs italic text-deep-dim">
              &quot;{pending.text}&quot;
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.value}
                  onClick={() => setPendKind(k.value)}
                  className={`rounded-md border px-2 py-2 text-xs font-semibold tracking-tight transition ${
                    pendKind === k.value
                      ? "border-deep-accent bg-deep-accent/10 text-deep-accent"
                      : "border-deep-border text-deep-dim hover:text-deep-text"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <textarea
              className="input mt-3 min-h-[90px] resize-y"
              value={pendBody}
              onChange={(e) => setPendBody(e.target.value)}
              placeholder={
                pendKind === "remove"
                  ? "Optional: why should this be removed?"
                  : "Explain your suggestion."
              }
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={confirmAnnotation}
                disabled={
                  pendKind !== "remove" && pendBody.trim().length === 0
                }
              >
                Add suggestion
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={randomizeModal}
        title="You have an unsubmitted review"
        body="If you switch to another paper now, your current highlights and comments will be discarded. You have not submitted this review yet."
        confirmLabel="Discard and get new paper"
        cancelLabel="Keep reviewing"
        danger
        onCancel={() => setRandomizeModal(false)}
        onConfirm={discardAndRandomize}
      />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="mono px-4 py-20 text-center text-xs uppercase tracking-widest text-deep-dim">
          Loading.
        </div>
      }
    >
      <ReviewInner />
    </Suspense>
  );
}
