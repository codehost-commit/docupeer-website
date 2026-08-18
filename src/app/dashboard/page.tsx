"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/client";
import { educationLabel } from "@/lib/constants";

type Dashboard = {
  profile: {
    name: string;
    expertiseCategory: string;
    specialty: string;
    educationLevel: string;
    gradeYear: string | null;
    strength: number;
  };
  stats: {
    reviewsCompleted: number;
    papersSubmitted: number;
    reviewsReceived: number;
    creditsEarned: number;
    creditsAvailable: number;
    reviewsTowardNext: number;
    reviewsNeededForNext: number;
    nextSubmissionUnlocked: boolean;
    submittedInLast24h: boolean;
    nextSubmissionAvailableAt: string | null;
    reviewsPerCredit: number;
  };
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="italic text-sm text-deep-dim">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-deep-text">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-deep-dim">{hint}</div>}
    </div>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Dashboard>("/api/dashboard")
      .then(setData)
      .catch((err) => {
        if (err?.status === 401) router.push("/login?next=/dashboard");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <div className="mono mx-auto max-w-5xl px-4 py-16 text-xs uppercase tracking-widest text-deep-dim">
        Loading.
      </div>
    );
  if (!data) return null;

  const { profile, stats } = data;
  const per = stats.reviewsPerCredit;
  const pct = Math.min(100, (stats.reviewsTowardNext / per) * 100);
  const unlocked = stats.nextSubmissionUnlocked;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="mt-1 text-2xl font-bold tracking-tight text-deep-text">
            Hi, {profile.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-deep-dim">
            Your reviewing progress and submission status.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/review" className="btn-secondary">
            Review a paper
          </Link>
          <Link
            href="/submit"
            className={
              unlocked && !stats.submittedInLast24h ? "btn-primary" : "btn-ghost"
            }
          >
            Submit a paper
          </Link>
        </div>
      </div>

      {/* Progress toward next submission */}
      <div className="card mt-6 overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="italic text-sm text-deep-dim">
                Reviews toward next submission
              </span>
              {unlocked ? (
                <span className="pill-unlocked">
                  <IconCheck className="h-3.5 w-3.5" />
                  Unlocked
                </span>
              ) : (
                <span className="pill-locked">
                  <IconLock className="h-3.5 w-3.5" />
                  Locked
                </span>
              )}
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="mono text-4xl font-semibold tracking-tight text-deep-text">
                {stats.reviewsTowardNext} / {per}
              </span>
              <span className="text-sm text-deep-dim">
                reviews in this cycle
              </span>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-deep-border/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  unlocked ? "bg-deep-good" : "bg-deep-accent"
                }`}
                style={{ width: `${unlocked ? 100 : pct}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-deep-dim">
              {unlocked ? (
                stats.submittedInLast24h ? (
                  <>
                    You have unlocked a submission, but you have already
                    submitted a paper today. The daily limit resets{" "}
                    {stats.nextSubmissionAvailableAt
                      ? `at ${new Date(
                          stats.nextSubmissionAvailableAt
                        ).toLocaleString()}`
                      : "soon"}
                    .
                  </>
                ) : (
                  <>
                    You have{" "}
                    <strong className="text-deep-good">
                      {stats.creditsAvailable} submission credit
                      {stats.creditsAvailable === 1 ? "" : "s"}
                    </strong>{" "}
                    ready. Submit whenever you like.
                  </>
                )
              ) : (
                <>
                  Complete{" "}
                  <strong className="text-deep-text">
                    {stats.reviewsNeededForNext} more review
                    {stats.reviewsNeededForNext === 1 ? "" : "s"}
                  </strong>{" "}
                  to unlock your next submission.
                </>
              )}
            </p>
          </div>

          <div className="surface px-5 py-4 text-center">
            <div className="mono text-3xl font-semibold tracking-tight text-deep-accent">
              {stats.creditsAvailable}
            </div>
            <div className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-deep-dim">
              credits available
            </div>
          </div>
        </div>
      </div>

      {/* Numbers */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reviews completed" value={stats.reviewsCompleted} />
        <Stat
          label="Reviews required for next"
          value={unlocked ? "0" : stats.reviewsNeededForNext}
          hint={
            unlocked
              ? "Next submission is unlocked"
              : `${per} per submission`
          }
        />
        <Stat label="Credits earned" value={stats.creditsEarned} />
        <Stat label="Papers submitted" value={stats.papersSubmitted} />
        <Stat label="Reviews received" value={stats.reviewsReceived} />
        <Stat
          label="Daily submission"
          value={stats.submittedInLast24h ? "Used" : "Available"}
          hint={
            stats.submittedInLast24h
              ? "1 paper per day limit"
              : "Ready to submit"
          }
        />
        <Stat
          label="Expertise"
          value={<span className="text-lg">{profile.expertiseCategory}</span>}
          hint={profile.specialty}
        />
        <Stat
          label="Level and strength"
          value={
            <span className="text-lg">
              {educationLabel(profile.educationLevel)}
            </span>
          }
          hint={`Strength ${profile.strength}%${
            profile.gradeYear ? ` . ${profile.gradeYear}` : ""
          }`}
        />
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/history"
          className="link mono text-xs uppercase tracking-[0.16em]"
        >
          View history and feedback received
        </Link>
      </div>
    </div>
  );
}
