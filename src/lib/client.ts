"use client";

// Client-side helpers: typed fetch wrappers, an auth hook, and the local
// draft store used to preserve unfinished reviews (including across sign-in).

import { useCallback, useEffect, useState } from "react";

export type Me = {
  id: string;
  name: string;
  email: string;
  expertiseCategory: string;
  specialty: string;
  educationLevel: string;
  gradeYear: string | null;
  strength: number;
} | null;

export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: res.status, data });
  return data as T;
}

export async function apiPost<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: res.status, data });
  return data as T;
}

export function useMe() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await apiGet<{ user: Me }>("/api/auth/me");
      setMe(user);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { me, loading, refresh, setMe };
}

// ---- Draft store (localStorage) ------------------------------------------
// Drafts are keyed by paper id so a logged-out reviewer's work survives the
// sign-in redirect and page reloads.

export type DraftAnnotation = {
  id: string;
  startOffset: number;
  endOffset: number;
  quotedText: string;
  kind: "comment" | "add" | "remove";
  body: string;
};

export type ReviewDraft = {
  paperId: string;
  comment: string;
  annotations: DraftAnnotation[];
  updatedAt: number;
};

const DRAFT_PREFIX = "docupeer:draft:";

export function loadDraft(paperId: string): ReviewDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + paperId);
    return raw ? (JSON.parse(raw) as ReviewDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: ReviewDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DRAFT_PREFIX + draft.paperId,
      JSON.stringify({ ...draft, updatedAt: Date.now() })
    );
  } catch {
    /* ignore quota errors */
  }
}

export function clearDraft(paperId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + paperId);
  } catch {
    /* ignore */
  }
}

export function draftHasContent(d: ReviewDraft | null | undefined): boolean {
  if (!d) return false;
  return d.comment.trim().length > 0 || d.annotations.length > 0;
}
