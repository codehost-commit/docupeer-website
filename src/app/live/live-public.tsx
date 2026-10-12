"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PODCAST_COMMENT_LIMIT,
  SEASON_TWO_EPISODES,
  type PodcastComment,
  type PodcastEpisodeId,
} from "@/lib/podcasts-shared";

type Show = "ackee" | "podcasts";
type Season = 1 | 2;

function DefaultAvatar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-[#d9dadd] ${className}`}
    >
      <svg viewBox="0 0 48 48" className="h-full w-full fill-[#9ca1a8]">
        <circle cx="24" cy="17" r="8" />
        <path d="M8 43c1.4-10.1 7.2-15 16-15s14.6 4.9 16 15H8Z" />
      </svg>
    </span>
  );
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function PodcastPublic() {
  const [show, setShow] = useState<Show>("podcasts");
  const [season, setSeason] = useState<Season>(2);
  const [episodeId, setEpisodeId] = useState<PodcastEpisodeId>(
    SEASON_TWO_EPISODES[1].id
  );
  const [comments, setComments] = useState<PodcastComment[]>([]);
  const [comment, setComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const episode = SEASON_TWO_EPISODES.find((item) => item.id === episodeId)!;

  useEffect(() => {
    setComments([]);
    setCommentError("");

    if (show !== "podcasts" || season !== 2 || !episode.available) {
      setLoadingComments(false);
      return;
    }

    let cancelled = false;
    setLoadingComments(true);

    fetch(`/api/podcasts/comments?episode=${encodeURIComponent(episodeId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load comments.");
        if (!cancelled) setComments(data.comments || []);
      })
      .catch((err) => {
        if (!cancelled) setCommentError(err.message || "Could not load comments.");
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [episode.available, episodeId, season, show]);

  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();
    if (!episode.available || !body || posting) return;

    setPosting(true);
    setCommentError("");
    try {
      const response = await fetch("/api/podcasts/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ episodeId, comment: body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not post your comment.");

      setComments((current) => [...current, data.comment]);
      setComment("");
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : "Could not post your comment."
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-deep-bg text-deep-text">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-deep-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex w-fit items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-deep-accent text-sm font-bold text-white shadow-sm">
              DP
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-deep-dim">
                DocuPeer
              </span>
              <span className="display block text-2xl leading-none text-deep-text">
                Podcasts
              </span>
            </span>
          </Link>
          <Link href="/" className="btn-secondary self-start sm:self-auto">
            Back to DocuPeer
          </Link>
        </header>

        <main className="py-10 sm:py-14">
          <section className="relative overflow-hidden rounded-3xl border border-deep-border bg-deep-panel px-6 py-10 shadow-panel sm:px-10 sm:py-14">
            <div className="absolute -right-28 -top-24 h-72 w-72 rounded-full bg-deep-accent/10 blur-3xl" />
            <div className="absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-[#ad7757]/10 blur-3xl" />
            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-deep-accent">
                Listen, watch, and talk back
              </p>
              <h1 className="display mt-4 text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
                DocuPeer Podcasts
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-deep-text-soft sm:text-lg">
                A space for the DocuPeer community to hang out, play, and share
                what we are learning along the way.
              </p>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="show-picker-heading">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-deep-dim">
                  Shows
                </p>
                <h2 id="show-picker-heading" className="mt-1 text-3xl">
                  Choose a series
                </h2>
              </div>
              <p className="text-sm text-deep-dim">More episodes are on the way.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setShow("ackee")}
                aria-pressed={show === "ackee"}
                className={`group rounded-2xl border p-6 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-accent ${
                  show === "ackee"
                    ? "border-deep-accent bg-deep-accent-soft shadow-panel"
                    : "border-deep-border bg-deep-panel hover:border-deep-accent/60"
                }`}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6cba7] text-lg text-[#70492c]">
                  ✦
                </span>
                <span className="display mt-4 block text-3xl">1 Minute with Ackee</span>
                <span className="mt-2 block max-w-md text-sm leading-6 text-deep-text-soft">
                  Brief, bright takes from Ackee. Tap in for the first drop.
                </span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-deep-accent">
                  Open series <span aria-hidden="true">→</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShow("podcasts")}
                aria-pressed={show === "podcasts"}
                className={`group rounded-2xl border p-6 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-accent ${
                  show === "podcasts"
                    ? "border-deep-accent bg-deep-accent-soft shadow-panel"
                    : "border-deep-border bg-deep-panel hover:border-deep-accent/60"
                }`}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#c7dce9] text-lg text-[#2f607c]">
                  ◉
                </span>
                <span className="display mt-4 block text-3xl">Podcasts</span>
                <span className="mt-2 block max-w-md text-sm leading-6 text-deep-text-soft">
                  Games, conversations, and the DocuPeer team being themselves.
                </span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-deep-accent">
                  Browse seasons <span aria-hidden="true">→</span>
                </span>
              </button>
            </div>
          </section>

          {show === "ackee" ? (
            <section className="mt-8 rounded-3xl border border-dashed border-deep-border-strong bg-deep-panel2/70 px-6 py-12 text-center sm:px-10">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-deep-accent-soft text-2xl text-deep-accent">
                ✦
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-deep-dim">
                1 Minute with Ackee
              </p>
              <h2 className="mt-2 text-4xl">Videos coming soon</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-deep-text-soft">
                Ackee&apos;s first minute is getting ready for its premiere. Check
                back soon.
              </p>
            </section>
          ) : (
            <section className="mt-8" aria-labelledby="podcast-heading">
              <div className="rounded-3xl border border-deep-border bg-deep-panel p-5 shadow-panel sm:p-7">
                <div className="flex flex-col gap-5 border-b border-deep-border pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-deep-dim">
                      Podcasts
                    </p>
                    <h2 id="podcast-heading" className="mt-1 text-4xl">
                      Pick a season
                    </h2>
                  </div>
                  <div className="flex gap-2" role="tablist" aria-label="Podcast seasons">
                    {[1, 2].map((number) => {
                      const active = season === number;
                      return (
                        <button
                          key={number}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSeason(number as Season)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-accent ${
                            active
                              ? "border-deep-accent bg-deep-accent text-white"
                              : "border-deep-border bg-deep-panel2 text-deep-text hover:border-deep-accent/60"
                          }`}
                        >
                          <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${active ? "bg-white/20" : "bg-deep-accent-soft text-deep-accent"}`}>
                            {number}
                          </span>
                          Season {number}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {season === 1 ? (
                  <div className="grid min-h-[23rem] place-items-center py-10 text-center">
                    <div className="max-w-lg">
                      <span className="inline-flex rounded-full border border-deep-accent/30 bg-deep-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-deep-accent">
                        Season 1 · BloxD
                      </span>
                      <h3 className="mt-5 text-4xl">Podcasts coming soon</h3>
                      <p className="mt-3 text-sm leading-6 text-deep-text-soft">
                        Season 1 has the team playing BloxD. The episodes will land
                        here soon.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pt-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-deep-dim">
                          Season 2
                        </p>
                        <h3 className="mt-1 text-3xl">Episodes</h3>
                      </div>
                      <p className="text-sm text-deep-dim">
                        Choose an episode while keeping seasons in view.
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {SEASON_TWO_EPISODES.map((item) => {
                        const active = item.id === episodeId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setEpisodeId(item.id)}
                            aria-pressed={active}
                            className={`rounded-xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-accent ${
                              active
                                ? "border-deep-accent bg-deep-accent text-white"
                                : "border-deep-border bg-deep-panel2 hover:border-deep-accent/60"
                            }`}
                          >
                            <span className={`block text-xs font-semibold uppercase tracking-[0.15em] ${active ? "text-white/70" : "text-deep-dim"}`}>
                              {item.available ? "Available" : "Coming soon"}
                            </span>
                            <span className="display mt-1 block text-2xl">{item.number}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                      <article className="overflow-hidden rounded-2xl border border-deep-border bg-[#101823] shadow-panel">
                        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#172534] px-4 py-3 text-white">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                              DocuPeer Podcasts · Season 2
                            </p>
                            <h4 className="mt-0.5 text-lg font-semibold text-white">
                              {episode.title}
                            </h4>
                          </div>
                          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                            {episode.available ? "Now playing" : "Coming soon"}
                          </span>
                        </div>
                        {episode.available && episode.src ? (
                          <video
                            key={episode.id}
                            controls
                            preload="metadata"
                            className="block aspect-video w-full bg-black"
                            aria-label={`DocuPeer Podcasts Season 2 ${episode.title}`}
                          >
                            <source src={episode.src} type="video/mp4" />
                            Your browser does not support video playback.
                          </video>
                        ) : (
                          <div className="grid aspect-video place-items-center bg-[#101823] px-6 text-center text-white">
                            <div>
                              <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/65">
                                Episode {episode.number}
                              </span>
                              <p className="mt-4 text-xl font-semibold">This episode is coming soon.</p>
                              <p className="mt-2 text-sm leading-6 text-white/60">
                                We&apos;re getting this one ready. Try another episode in the meantime.
                              </p>
                            </div>
                          </div>
                        )}
                      </article>

                      <aside className="flex min-h-[30rem] flex-col rounded-2xl border border-deep-border bg-deep-panel2">
                        <div className="border-b border-deep-border px-5 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <h4 className="text-xl">Comments</h4>
                            <span className="rounded-full bg-deep-accent-soft px-2.5 py-1 text-[11px] font-semibold text-deep-accent">
                              {episode.available
                                ? `${comments.length} / ${PODCAST_COMMENT_LIMIT}`
                                : "Coming soon"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-deep-dim">
                            {episode.available
                              ? `Temporary cap: each episode can have up to ${PODCAST_COMMENT_LIMIT} comments for now.`
                              : "Comments will open when this episode is released."}
                          </p>
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 xl:max-h-[27rem]">
                          {!episode.available ? (
                            <div className="flex flex-col items-center py-8 text-center">
                              <DefaultAvatar className="h-12 w-12" />
                              <p className="mt-3 text-sm font-medium text-deep-text">Comments are not open yet</p>
                              <p className="mt-1 text-xs leading-5 text-deep-dim">
                                Come back when Episode {episode.number} premieres.
                              </p>
                            </div>
                          ) : loadingComments ? (
                            <p className="text-sm text-deep-dim">Loading comments…</p>
                          ) : comments.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-center">
                              <DefaultAvatar className="h-12 w-12" />
                              <p className="mt-3 text-sm font-medium text-deep-text">Start the conversation</p>
                              <p className="mt-1 text-xs leading-5 text-deep-dim">
                                Be the first to leave a thought on this episode.
                              </p>
                            </div>
                          ) : (
                            comments.map((item) => (
                              <article key={item.id} className="flex gap-3">
                                <DefaultAvatar className="h-9 w-9" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span className="text-sm font-semibold">DocuPeer listener</span>
                                    <time className="text-[11px] text-deep-dim">
                                      {formatCommentDate(item.createdAt)}
                                    </time>
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-deep-text-soft">
                                    {item.body}
                                  </p>
                                </div>
                              </article>
                            ))
                          )}
                        </div>

                        {episode.available && (
                          <form onSubmit={postComment} className="border-t border-deep-border p-4">
                            <label htmlFor="podcast-comment" className="sr-only">
                              Add a comment
                            </label>
                            <textarea
                              id="podcast-comment"
                              value={comment}
                              onChange={(event) => setComment(event.target.value)}
                              maxLength={300}
                              rows={3}
                              disabled={comments.length >= PODCAST_COMMENT_LIMIT || posting}
                              placeholder={
                                comments.length >= PODCAST_COMMENT_LIMIT
                                  ? "This episode's temporary comment limit has been reached."
                                  : "Share a thought…"
                              }
                              className="input min-h-[5.5rem] resize-none disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span className="text-[11px] text-deep-dim">{comment.length}/300</span>
                              <button
                                type="submit"
                                disabled={!comment.trim() || posting || comments.length >= PODCAST_COMMENT_LIMIT}
                                className="btn-primary px-4 py-2 text-xs"
                              >
                                {posting ? "Posting…" : "Post comment"}
                              </button>
                            </div>
                            {commentError && (
                              <p role="alert" className="mt-2 text-xs font-medium text-deep-bad">
                                {commentError}
                              </p>
                            )}
                          </form>
                        )}
                      </aside>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
