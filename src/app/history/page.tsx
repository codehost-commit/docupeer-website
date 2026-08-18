"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/client";
import { educationLabel } from "@/lib/constants";
import { kindLabel } from "@/lib/highlight";

type Annotation = {
  id: string;
  quotedText: string;
  kind: string;
  body: string;
};
type ReceivedPaper = {
  id: string;
  title: string;
  category: string;
  specialty: string;
  educationLevel: string;
  createdAt: string;
  reviews: {
    id: string;
    comment: string;
    createdAt: string;
    annotations: Annotation[];
  }[];
};
type MyReview = {
  id: string;
  comment: string;
  createdAt: string;
  paper: {
    id: string;
    title: string;
    category: string;
    specialty: string;
    educationLevel: string;
  };
  _count: { annotations: number };
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function HistoryInner() {
  const router = useRouter();
  const params = useSearchParams();
  const justSubmitted = params.get("submitted");

  const [tab, setTab] = useState<"received" | "done">("received");
  const [received, setReceived] = useState<ReceivedPaper[] | null>(null);
  const [myReviews, setMyReviews] = useState<MyReview[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ papers: ReceivedPaper[] }>("/api/reviews/received"),
      apiGet<{ reviews: MyReview[] }>("/api/reviews"),
    ])
      .then(([a, b]) => {
        setReceived(a.papers);
        setMyReviews(b.reviews);
      })
      .catch((err) => {
        if (err?.status === 401) router.push("/login?next=/history");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <div className="mono mx-auto max-w-4xl px-4 py-16 text-xs uppercase tracking-widest text-deep-dim">
        Loading.
      </div>
    );

  const totalReceived =
    received?.reduce((n, p) => n + p.reviews.length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><h1 className="mt-1 text-2xl font-bold tracking-tight text-deep-text">
        Your history
      </h1>
      <p className="mt-1 text-sm text-deep-dim">
        Feedback you have received and reviews you have contributed.
      </p>

      {justSubmitted && (
        <div className="mt-4 rounded-lg border border-deep-good/40 bg-deep-good/10 px-4 py-3 text-sm text-deep-good">
          Your paper was submitted. Reviewers will start seeing it right away.
          Check back here for feedback.
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 inline-flex rounded-md border border-deep-border bg-deep-panel p-1">
        <button
          onClick={() => setTab("received")}
          className={`rounded px-4 py-1.5 text-sm font-semibold tracking-tight transition ${
            tab === "received"
              ? "bg-deep-accent text-white"
              : "text-deep-dim hover:text-deep-text"
          }`}
        >
          Feedback received ({totalReceived})
        </button>
        <button
          onClick={() => setTab("done")}
          className={`rounded px-4 py-1.5 text-sm font-semibold tracking-tight transition ${
            tab === "done"
              ? "bg-deep-accent text-white"
              : "text-deep-dim hover:text-deep-text"
          }`}
        >
          Reviews I have done ({myReviews?.length ?? 0})
        </button>
      </div>

      {/* Received */}
      {tab === "received" && (
        <div className="mt-6 space-y-5">
          {received && received.length > 0 ? (
            received.map((p) => (
              <div key={p.id} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-deep-text">
                    {p.title}
                  </h2>
                  <span className="italic text-sm text-deep-dim">
                    Submitted {fmt(p.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="chip">{p.category}</span>
                  <span className="chip">{p.specialty}</span>
                  <span className="chip">{educationLabel(p.educationLevel)}</span>
                </div>

                {p.reviews.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-deep-border px-4 py-6 text-center text-sm text-deep-dim">
                    No reviews yet. Matched reviewers will see this soon.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {p.reviews.map((r, idx) => (
                      <div key={r.id} className="surface p-4">
                        <div className="flex items-center justify-between">
                          <span className="italic text-sm text-deep-accent">
                            Anonymous reviewer #{idx + 1}
                          </span>
                          <span className="italic text-sm text-deep-dim">
                            {fmt(r.createdAt)}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-deep-text/90">
                            {r.comment}
                          </p>
                        )}
                        {r.annotations.length > 0 && (
                          <ul className="mt-3 space-y-2">
                            {r.annotations.map((a) => (
                              <li
                                key={a.id}
                                className="rounded-md border border-deep-border bg-deep-panel p-3 text-sm"
                              >
                                <span className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-deep-accent">
                                  {kindLabel(a.kind)}
                                </span>
                                <p className="mt-1 border-l-2 border-deep-border pl-2 text-xs italic text-deep-dim">
                                  &quot;{a.quotedText}&quot;
                                </p>
                                {a.body && (
                                  <p className="mt-1 text-deep-text/90">
                                    {a.body}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card p-10 text-center">
              <p className="text-deep-dim">
                You have not submitted any papers yet.
              </p>
              <Link href="/submit" className="btn-primary mt-4">
                Submit your first paper
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Reviews done */}
      {tab === "done" && (
        <div className="mt-6 space-y-3">
          {myReviews && myReviews.length > 0 ? (
            myReviews.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-deep-text">
                    {r.paper.title}
                  </h3>
                  <span className="italic text-sm text-deep-dim">
                    {fmt(r.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="chip">{r.paper.category}</span>
                  <span className="chip">{r.paper.specialty}</span>
                  <span className="chip">
                    {r._count.annotations} highlight
                    {r._count.annotations === 1 ? "" : "s"}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 line-clamp-3 text-sm text-deep-dim">
                    {r.comment}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="card p-10 text-center">
              <p className="text-deep-dim">
                You have not completed any reviews yet.
              </p>
              <Link href="/review" className="btn-primary mt-4">
                Start reviewing
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="mono px-4 py-16 text-center text-xs uppercase tracking-widest text-deep-dim">
          Loading.
        </div>
      }
    >
      <HistoryInner />
    </Suspense>
  );
}
