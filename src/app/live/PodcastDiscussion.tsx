"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  PODCAST_COMMENTS_OPEN,
  type PodcastComment,
  type PodcastCommentThreadId,
} from "@/lib/podcasts-shared";

type PodcastDiscussionProps = {
  threadId: PodcastCommentThreadId;
  eyebrow: string;
  heading: string;
  description: string;
  emptyMessage: string;
  placeholder: string;
  allowPosting?: boolean;
  className?: string;
};

function isLocalhostUrl() {
  if (typeof window === "undefined") return false;

  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  );
}

function commentsApiUrl() {
  return isLocalhostUrl()
    ? "https://docupeer.org/api/podcasts/comments"
    : "/api/podcasts/comments";
}

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

export function PodcastDiscussion({
  threadId,
  eyebrow,
  heading,
  description,
  emptyMessage,
  placeholder,
  allowPosting = true,
  className = "",
}: PodcastDiscussionProps) {
  const [comments, setComments] = useState<PodcastComment[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [testingOnLocalhost, setTestingOnLocalhost] = useState(false);
  const commentsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTestingOnLocalhost(isLocalhostUrl());
  }, []);

  useEffect(() => {
    const list = commentsListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [comments.length]);

  useEffect(() => {
    setComments([]);
    setComment("");
    setError("");

    if (!PODCAST_COMMENTS_OPEN) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadComments = async () => {
      try {
        const response = await fetch(
          `${commentsApiUrl()}?thread=${encodeURIComponent(threadId)}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load comments.");
        if (!cancelled) setComments(data.comments || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load comments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadComments();
    const refreshTimer = window.setInterval(loadComments, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [threadId]);

  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();
    if (!body || posting) return;

    setPosting(true);
    setError("");
    try {
      const response = await fetch(commentsApiUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, comment: body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not post your comment.");

      setComments((current) => [...current, data.comment]);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your comment.");
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(item: PodcastComment) {
    if (!testingOnLocalhost || deletingCommentId) return;
    if (!window.confirm(`Delete this live comment?\n\n${item.body}`)) return;

    const password = window.prompt("Enter the DocuPeer admin password:");
    if (password === null) return;

    setDeletingCommentId(item.id);
    setError("");
    try {
      const response = await fetch(commentsApiUrl(), {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commentId: item.id, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete the comment.");

      setComments((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the comment.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-deep-border bg-deep-panel shadow-panel ${className}`}
    >
      <div className="border-b border-deep-border px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-dim">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-3xl">{heading}</h2>
          </div>
          <span className="w-fit rounded-full bg-deep-accent-soft px-3 py-1 text-xs font-semibold text-deep-accent">
            {!allowPosting && "Read only · "}
            {comments.length} {comments.length === 1 ? "message" : "messages"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-deep-text-soft">{description}</p>
      </div>

      <div
        ref={commentsListRef}
        className="max-h-80 min-h-40 space-y-4 overflow-y-auto px-5 py-5 sm:px-7"
        aria-live="polite"
      >
        {!PODCAST_COMMENTS_OPEN ? (
          <p className="text-sm text-deep-dim">The discussion is closed for now.</p>
        ) : loading ? (
          <p className="text-sm text-deep-dim">Loading messages…</p>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center py-5 text-center">
            <DefaultAvatar className="h-12 w-12" />
            <p className="mt-3 text-sm font-medium text-deep-text">Start the conversation</p>
            <p className="mt-1 text-xs leading-5 text-deep-dim">{emptyMessage}</p>
          </div>
        ) : (
          comments.map((item) => (
            <article key={item.id} className="flex gap-3">
              <DefaultAvatar className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold">DocuPeer listener</span>
                  {testingOnLocalhost && (
                    <button
                      type="button"
                      onClick={() => deleteComment(item)}
                      disabled={Boolean(deletingCommentId)}
                      className="shrink-0 text-[11px] font-semibold text-deep-bad transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingCommentId === item.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-deep-text-soft">
                  {item.body}
                </p>
              </div>
            </article>
          ))
        )}
      </div>

      {PODCAST_COMMENTS_OPEN && allowPosting && (
        <form onSubmit={postComment} className="border-t border-deep-border p-4 sm:px-7 sm:py-5">
          <label htmlFor={`comment-${threadId}`} className="sr-only">
            Add a message
          </label>
          <textarea
            id={`comment-${threadId}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={300}
            rows={3}
            disabled={posting}
            placeholder={placeholder}
            className="input min-h-[5.5rem] resize-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-deep-dim">{comment.length}/300</span>
            <button
              type="submit"
              disabled={!comment.trim() || posting}
              className="btn-primary px-4 py-2 text-xs"
            >
              {posting ? "Posting…" : "Post message"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-deep-bad">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
