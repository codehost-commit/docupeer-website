"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client";
import {
  EDUCATION_LEVELS,
  EXPERTISE_CATEGORIES,
  MIN_PAPER_WORDS,
  PAPER_TYPES,
} from "@/lib/constants";

type Stats = {
  canSubmit: boolean;
  nextSubmissionUnlocked: boolean;
  reviewsNeededForNext: number;
  submittedInLast24h: boolean;
  nextSubmissionAvailableAt: string | null;
  creditsAvailable: number;
};

function countWords(t: string) {
  const s = t.trim();
  return s ? s.split(/\s+/).length : 0;
}

export default function SubmitPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    text: "",
    category: "",
    specialty: "",
    educationLevel: "",
    paperType: "",
    feedbackWanted: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const words = useMemo(() => countWords(form.text), [form.text]);
  const meetsLength = words >= MIN_PAPER_WORDS;

  useEffect(() => {
    apiGet<{ stats: Stats }>("/api/dashboard")
      .then((d) => setStats(d.stats))
      .catch((err) => {
        if (err?.status === 401) router.push("/login?next=/submit");
      })
      .finally(() => setStatsLoading(false));
  }, [router]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setServerError("");
    try {
      const { paperId } = await apiPost<{ paperId: string }>(
        "/api/papers",
        form
      );
      router.push(`/history?submitted=${paperId}`);
    } catch (err: any) {
      if (err?.data?.errors) setErrors(err.data.errors);
      else setServerError(err?.message || "Could not submit your paper.");
      setBusy(false);
    }
  }

  const locked = stats && !stats.canSubmit;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><h1 className="mt-1 text-2xl font-bold tracking-tight text-deep-text">
        Submit a paper
      </h1>
      <p className="mt-1 text-sm text-deep-dim">
        Your paper is shown to reviewers anonymously. Minimum {MIN_PAPER_WORDS}{" "}
        words.
      </p>

      {!statsLoading && stats && (
        <div
          className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
            locked
              ? "border-deep-warn/40 bg-deep-warn/10 text-deep-warn"
              : "border-deep-good/40 bg-deep-good/10 text-deep-good"
          }`}
        >
          {stats.canSubmit ? (
            <>
              You have{" "}
              <strong>
                {stats.creditsAvailable} submission credit
                {stats.creditsAvailable === 1 ? "" : "s"}
              </strong>{" "}
              available. You are clear to submit.
            </>
          ) : !stats.nextSubmissionUnlocked ? (
            <>
              You need{" "}
              <strong>
                {stats.reviewsNeededForNext} more completed review
                {stats.reviewsNeededForNext === 1 ? "" : "s"}
              </strong>{" "}
              to unlock a submission.{" "}
              <Link href="/review" className="link">
                Review a paper.
              </Link>
            </>
          ) : (
            <>
              You have already submitted a paper today (one per day).
              {stats.nextSubmissionAvailableAt && (
                <>
                  {" "}
                  Try again at{" "}
                  {new Date(stats.nextSubmissionAvailableAt).toLocaleString()}.
                </>
              )}
            </>
          )}
        </div>
      )}

      {serverError && (
        <div className="mt-4 rounded-lg border border-deep-bad/40 bg-deep-bad/10 px-4 py-3 text-sm text-deep-bad">
          {serverError}
        </div>
      )}

      <form onSubmit={submit} className="card mt-5 space-y-5 p-6 sm:p-8">
        <div>
          <label className="label">Paper title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="A concise, descriptive title"
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">Select.</option>
              {EXPERTISE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="field-error">{errors.category}</p>
            )}
          </div>
          <div>
            <label className="label">Specialty or topic</label>
            <input
              className="input"
              value={form.specialty}
              onChange={(e) => set("specialty", e.target.value)}
              placeholder="e.g. Thermodynamics, American history"
            />
            {errors.specialty && (
              <p className="field-error">{errors.specialty}</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Intended education level</label>
            <select
              className="input"
              value={form.educationLevel}
              onChange={(e) => set("educationLevel", e.target.value)}
            >
              <option value="">Select.</option>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {errors.educationLevel && (
              <p className="field-error">{errors.educationLevel}</p>
            )}
          </div>
          <div>
            <label className="label">Paper type</label>
            <select
              className="input"
              value={form.paperType}
              onChange={(e) => set("paperType", e.target.value)}
            >
              <option value="">Select.</option>
              {PAPER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.paperType && (
              <p className="field-error">{errors.paperType}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label mb-0">Paper text</label>
            <span
              className={`mono text-[11px] ${
                meetsLength ? "text-deep-good" : "text-deep-dim"
              }`}
            >
              {words} / {MIN_PAPER_WORDS} words {meetsLength ? "(met)" : ""}
            </span>
          </div>
          <textarea
            className="input mt-1.5 min-h-[300px] resize-y font-serif text-[1.02rem] leading-relaxed"
            value={form.text}
            onChange={(e) => set("text", e.target.value)}
            placeholder="Paste or write your paper here."
          />
          {errors.text && <p className="field-error">{errors.text}</p>}
        </div>

        <div>
          <label className="label">Feedback you want (optional)</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.feedbackWanted}
            onChange={(e) => set("feedbackWanted", e.target.value)}
            placeholder="e.g. Is my argument clear? Does the methodology hold up?"
          />
        </div>

        <button
          className="btn-primary w-full py-3"
          disabled={busy || Boolean(locked) || !meetsLength}
        >
          {busy
            ? "Submitting."
            : locked
              ? "Submission locked"
              : "Submit paper"}
        </button>
      </form>
    </div>
  );
}
