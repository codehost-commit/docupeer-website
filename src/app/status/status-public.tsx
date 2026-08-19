"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import {
  STATUS_META,
  formatEta,
  formatStatusPhase,
  formatStatusTime,
  type StatusSnapshotPayload,
} from "@/lib/status-shared";

type ToneStyle = CSSProperties & {
  "--status-color"?: string;
  "--status-soft"?: string;
  "--status-text"?: string;
};

function toneStyle(level: number): ToneStyle {
  const meta = STATUS_META[(level || 1) as keyof typeof STATUS_META] ?? STATUS_META[1];
  return {
    "--status-color": meta.color,
    "--status-soft": meta.softColor,
    "--status-text": meta.textColor,
  };
}

function StatusMark({ level }: { level: number }) {
  const meta = STATUS_META[(level || 1) as keyof typeof STATUS_META] ?? STATUS_META[1];
  return (
    <div
      className="grid h-16 w-16 shrink-0 place-items-center rounded-lg text-sm font-bold tracking-wide text-white shadow-[0_18px_50px_rgba(26,28,43,0.16)]"
      style={{ background: meta.color }}
      aria-hidden
    >
      {meta.symbol}
    </div>
  );
}

function HistoryStrip({ snapshot }: { snapshot: StatusSnapshotPayload }) {
  return (
    <div>
      <div className="grid h-20 grid-cols-[repeat(288,minmax(1px,1fr))] gap-px overflow-hidden rounded-md border border-[#d9d5cc] bg-[#d9d5cc]">
        {snapshot.history.map((item) => {
          const meta = STATUS_META[item.statusLevel];
          return (
            <span
              key={item.bucketTs}
              title={`${formatStatusTime(item.bucketTs)} - ${meta.label}`}
              className="block min-h-full"
              style={{ backgroundColor: meta.color }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-xs font-medium uppercase tracking-[0.12em] text-[#717784]">
        <span>24 hours ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}

function ReportList({
  empty,
  reports,
}: {
  empty: string;
  reports: StatusSnapshotPayload["reports24h"];
}) {
  if (!reports.length) {
    return (
      <div className="rounded-md border border-dashed border-[#cfc8bc] px-4 py-6 text-sm text-[#606978]">
        {empty}
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#e6e1d8] overflow-hidden rounded-lg border border-[#e0dbd2] bg-white">
      {reports.map((report) => {
        const meta = STATUS_META[report.statusLevel];
        return (
          <article key={report.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold" style={{ color: meta.textColor, background: meta.softColor }}>
                <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                {meta.label}
              </div>
              <time className="mt-3 block text-xs font-medium uppercase tracking-[0.12em] text-[#717784]">
                {formatStatusTime(report.createdAt)}
              </time>
            </div>
            <p className="text-sm leading-6 text-[#2d3342]">{report.message}</p>
          </article>
        );
      })}
    </div>
  );
}

export function StatusPublic({ initialSnapshot }: { initialSnapshot: StatusSnapshotPayload }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const meta = STATUS_META[snapshot.status.level];
  const phase = formatStatusPhase(snapshot.status.level, snapshot.status.phase);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    async function refresh() {
      const response = await fetch("/api/status/public?full=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh status.");
      setSnapshot(await response.json());
      setError("");
    }

    const timer = window.setInterval(() => {
      refresh().catch((err) => setError(err.message || "Could not refresh status."));
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#ded8cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="https://docupeer.org" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-[#596272]">DocuPeer</span>
              <span className="block text-xl font-semibold tracking-normal">System Status</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-md border border-[#ded8cc] bg-white px-3 py-2 font-medium text-[#596272]">
              Updated {formatStatusTime(snapshot.status.updatedAt)}
            </span>
            <Link href="https://docupeer.org" className="rounded-md bg-[#1f3447] px-4 py-2 font-semibold text-white transition hover:bg-[#162635]">
              Back to DocuPeer
            </Link>
          </div>
        </header>

        <main className="flex-1 py-10">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_22rem] lg:items-start">
            <div className="rounded-lg border border-[#ddd7cd] bg-white p-6 shadow-[0_24px_70px_rgba(30,33,42,0.08)] sm:p-8" style={toneStyle(snapshot.status.level)}>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <StatusMark level={snapshot.status.level} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#687180]">Current availability</p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#171b24] sm:text-5xl">
                    {meta.label}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#3a4250]">
                    {meta.sentence}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#e4ded4] bg-[#fbfaf7] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#717784]">Phase</div>
                  <div className="mt-2 text-lg font-semibold">{phase}</div>
                </div>
                <div className="rounded-lg border border-[#e4ded4] bg-[#fbfaf7] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#717784]">Maintenance</div>
                  <div className="mt-2 text-lg font-semibold">{snapshot.status.maintenanceMode ? "Active" : "Off"}</div>
                </div>
                <div className="rounded-lg border border-[#e4ded4] bg-[#fbfaf7] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#717784]">ETA</div>
                  <div className="mt-2 text-lg font-semibold">
                    {snapshot.status.etaAt ? formatEta(snapshot.status.etaAt, now) : "None posted"}
                  </div>
                </div>
              </div>

              {snapshot.status.maintenanceMode || snapshot.status.etaAt || error ? (
                <div className="mt-6 rounded-lg border border-[var(--status-color)] bg-[var(--status-soft)] px-4 py-4 text-sm leading-6 text-[var(--status-text)]">
                  {error ? error : null}
                  {!error && snapshot.status.maintenanceMode ? "Maintenance mode is active. We are routing visitors here until the site is ready for normal traffic again." : null}
                  {!error && !snapshot.status.maintenanceMode && snapshot.status.etaAt ? "An estimated resolution time has been posted. The countdown updates live on this page." : null}
                </div>
              ) : null}
            </div>

            <aside className="rounded-lg border border-[#ddd7cd] bg-[#1f3447] p-6 text-white shadow-[0_24px_70px_rgba(30,33,42,0.10)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b7c7d6]">Service window</p>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-sm text-[#c8d3df]">Public website</div>
                  <div className="mt-1 text-2xl font-semibold">{snapshot.status.level === 1 ? "Available" : meta.short}</div>
                </div>
                <div className="h-px bg-white/15" />
                <div>
                  <div className="text-sm text-[#c8d3df]">Reviewer tools</div>
                  <div className="mt-1 text-2xl font-semibold">{snapshot.status.level >= 4 ? "Interrupted" : "Available"}</div>
                </div>
                <div className="h-px bg-white/15" />
                <div>
                  <div className="text-sm text-[#c8d3df]">Submission flow</div>
                  <div className="mt-1 text-2xl font-semibold">{snapshot.status.level >= 3 ? "Limited" : "Available"}</div>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 rounded-lg border border-[#ddd7cd] bg-white p-6 shadow-[0_18px_60px_rgba(30,33,42,0.06)] sm:p-8">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">Last 24 hours</h2>
                <p className="mt-1 text-sm text-[#606978]">Each mark represents five minutes of service state.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_META).map(([level, item]) => (
                  <span key={level} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#596272]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    {item.short}
                  </span>
                ))}
              </div>
            </div>
            <HistoryStrip snapshot={snapshot} />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            <div>
              <h2 className="text-2xl font-semibold tracking-normal">Recent updates</h2>
              <div className="mt-4">
                <ReportList reports={snapshot.reports24h} empty="No status reports have been posted in the past 24 hours." />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-normal">Earlier updates</h2>
              <details className="mt-4 rounded-lg border border-[#ddd7cd] bg-white p-5">
                <summary className="cursor-pointer text-sm font-semibold text-[#2d3342]">
                  View archive ({snapshot.olderReports.length})
                </summary>
                <div className="mt-4">
                  <ReportList reports={snapshot.olderReports} empty="No older status reports are available." />
                </div>
              </details>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
