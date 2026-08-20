"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  TPT_CATEGORIES,
  TPT_CATEGORY_META,
  type TptCategory,
  type TptPublicItem,
  type TptPublicPayload,
} from "@/lib/tpt-shared";

type ActiveFilter = TptCategory | "all";

type FormState = {
  rating: number;
  title: string;
  body: string;
  displayName: string;
  isAnonymous: boolean;
  suggestedCategory: TptCategory;
  consentToPublish: boolean;
};

const initialForm: FormState = {
  rating: 5,
  title: "",
  body: "",
  displayName: "",
  isAnonymous: true,
  suggestedCategory: "love",
  consentToPublish: false,
};

const pageBackground: CSSProperties = {
  background:
    "radial-gradient(circle at 14% 6%, rgba(31, 52, 71, 0.12), transparent 30rem), radial-gradient(circle at 86% 18%, rgba(185, 145, 82, 0.16), transparent 28rem), linear-gradient(180deg, #f7f4ee 0%, #f4efe7 52%, #f9f7f1 100%)",
};

const paperGrain: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(31, 52, 71, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(31, 52, 71, 0.026) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
};

function formatDate(value: string | null) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function averageRating(items: TptPublicItem[]) {
  if (!items.length) return "0.0";
  const total = items.reduce((sum, item) => sum + item.rating, 0);
  return (total / items.length).toFixed(1);
}

function RatingButtons({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={`rounded-md border px-3 py-3 text-sm font-semibold transition ${
            value === rating
              ? "border-[#1f3447] bg-[#1f3447] text-white"
              : "border-[#d6d0c5] bg-white text-[#2d3342] hover:border-[#1f3447]"
          }`}
          aria-checked={value === rating}
          role="radio"
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

function TalkCard({ item }: { item: TptPublicItem }) {
  const meta = TPT_CATEGORY_META[item.category];
  return (
    <article className="rounded-lg border border-[#dcd6cb] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#1f3447] px-2.5 py-1 text-xs font-semibold text-white">
              {item.rating} / 5
            </span>
            <span className="rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-2.5 py-1 text-xs font-semibold text-[#596272]">
              {meta.shortLabel}
            </span>
            {item.featured ? (
              <span className="rounded-md border border-[#c5a86d] bg-[#fff8e6] px-2.5 py-1 text-xs font-semibold text-[#74561a]">
                Featured
              </span>
            ) : null}
          </div>
          {item.title ? (
            <h3 className="mt-4 text-2xl font-semibold tracking-normal text-[#171b24]">
              {item.title}
            </h3>
          ) : null}
        </div>
        <time className="text-xs font-semibold uppercase tracking-[0.12em] text-[#717784]">
          {formatDate(item.approvedAt ?? item.createdAt)}
        </time>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#2d3342]">
        {item.body}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-[#ece6dc] pt-4 text-sm">
        <span className="font-semibold text-[#171b24]">{item.publicName}</span>
        <span className="text-[#707887]">Published by admin review</span>
      </div>
    </article>
  );
}

export function TptPublic({ initialPayload }: { initialPayload: TptPublicPayload }) {
  const [payload, setPayload] = useState(initialPayload);
  const [active, setActive] = useState<ActiveFilter>("all");
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const visibleItems = useMemo(
    () => payload.items.filter((item) => active === "all" || item.category === active),
    [active, payload.items],
  );

  useEffect(() => {
    async function refresh() {
      const response = await fetch("/api/tpt/public", { cache: "no-store" });
      if (!response.ok) return;
      setPayload(await response.json());
    }

    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setErrors({});

    try {
      const response = await fetch("/api/tpt/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 422) {
        setErrors(result.errors || {});
        throw new Error("Check the highlighted fields.");
      }
      if (!response.ok) throw new Error(result.error || "Could not submit your note.");

      setForm(initialForm);
      setMessage("Sent to admin review. If accepted, it will appear here.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not submit your note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden text-[#171b24]" style={pageBackground}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={paperGrain}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-white/50 blur-3xl"
      />
      <section className="relative overflow-hidden border-b border-[#ded8cc]/80">
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#596272]">
            The People's Talk
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-normal text-[#171b24] sm:text-6xl">
                The public wall for what DocuPeer users are saying.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#3a4250] sm:text-lg">
                TPT collects the reviews, praise, concerns, and sharp little notes
                that are good enough to publish. Every submission is reviewed by
                admin before it goes live.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#submit-tpt"
                  className="rounded-md bg-[#1f3447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162635]"
                >
                  Submit a note
                </a>
                <Link
                  href="/review"
                  className="rounded-md border border-[#d6d0c5] bg-white px-5 py-3 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]"
                >
                  Start reviewing
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-[#dcd6cb] bg-white/95 p-5 shadow-[0_24px_70px_rgba(29,33,42,0.09)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">
                Published signal
              </p>
              <div className="mt-5 grid gap-4">
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-[#606978]">Voices</span>
                  <span className="text-3xl font-semibold">{payload.counts.total}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-[#606978]">Average rating</span>
                  <span className="text-3xl font-semibold">{averageRating(payload.items)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 pb-20 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-[#dcd6cb] bg-white p-4 shadow-[0_18px_50px_rgba(29,33,42,0.05)]">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActive("all")}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  active === "all"
                    ? "bg-[#1f3447] text-white"
                    : "border border-[#d6d0c5] bg-[#fbfaf7] text-[#2d3342] hover:border-[#1f3447]"
                }`}
              >
                All ({payload.counts.total})
              </button>
              {TPT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActive(category)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    active === category
                      ? "bg-[#1f3447] text-white"
                      : "border border-[#d6d0c5] bg-[#fbfaf7] text-[#2d3342] hover:border-[#1f3447]"
                  }`}
                >
                  {TPT_CATEGORY_META[category].shortLabel} ({payload.counts[category]})
                </button>
              ))}
            </div>
          </section>

          {visibleItems.length ? (
            <div className="space-y-4">
              {visibleItems.map((item) => (
                <TalkCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <section className="rounded-lg border border-dashed border-[#cfc8bc] bg-white/70 p-8 text-center">
              <h2 className="text-2xl font-semibold tracking-normal">
                No published notes here yet.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#606978]">
                Once admin accepts submissions, they will appear in this section.
              </p>
            </section>
          )}
        </div>

        <aside id="submit-tpt" className="lg:sticky lg:top-24 lg:self-start">
          <form
            onSubmit={submit}
            className="rounded-lg border border-[#dcd6cb] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.07)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">
              Add your voice
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              Submit to TPT
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#606978]">
              Your note goes to admin first. Accepted notes publish to this page;
              denied notes are removed.
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">
                  Rating
                </span>
                <div className="mt-2">
                  <RatingButtons
                    value={form.rating}
                    onChange={(rating) => setForm((current) => ({ ...current, rating }))}
                  />
                </div>
                {errors.rating ? <span className="mt-1 block text-xs font-semibold text-[#842839]">{errors.rating}</span> : null}
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">
                  Category
                </span>
                <select
                  value={form.suggestedCategory}
                  onChange={(event) => setForm((current) => ({ ...current, suggestedCategory: event.target.value as TptCategory }))}
                  className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                >
                  {TPT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {TPT_CATEGORY_META[category].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">
                  Optional title
                </span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                  placeholder="A short headline"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">
                  Your note
                </span>
                <textarea
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  rows={6}
                  className="mt-2 w-full resize-none rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                  placeholder="What should people know?"
                />
                {errors.body ? <span className="mt-1 block text-xs font-semibold text-[#842839]">{errors.body}</span> : null}
              </label>

              <label className="flex items-start gap-3 rounded-md border border-[#d6d0c5] bg-[#fbfaf7] p-3">
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(event) => setForm((current) => ({ ...current, isAnonymous: event.target.checked }))}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#2d3342]">Post as anonymous</span>
                  <span className="block text-xs leading-5 text-[#707887]">Your name will not appear on accepted notes.</span>
                </span>
              </label>

              {!form.isAnonymous ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">
                    Display name
                  </span>
                  <input
                    value={form.displayName}
                    onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                    className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                    placeholder="Name shown if accepted"
                  />
                  {errors.displayName ? <span className="mt-1 block text-xs font-semibold text-[#842839]">{errors.displayName}</span> : null}
                </label>
              ) : null}

              <label className="flex items-start gap-3 rounded-md border border-[#d6d0c5] bg-[#fbfaf7] p-3">
                <input
                  type="checkbox"
                  checked={form.consentToPublish}
                  onChange={(event) => setForm((current) => ({ ...current, consentToPublish: event.target.checked }))}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#2d3342]">I understand this may be published.</span>
                  <span className="block text-xs leading-5 text-[#707887]">Admin reviews it first and can remove it instead.</span>
                </span>
              </label>
              {errors.consentToPublish ? <span className="block text-xs font-semibold text-[#842839]">{errors.consentToPublish}</span> : null}
            </div>

            {message ? (
              <div className="mt-5 rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm font-semibold text-[#2d3342]">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 w-full rounded-md bg-[#1f3447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:opacity-50"
            >
              Submit for review
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}
