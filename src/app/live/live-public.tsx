"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatLiveTime,
  type LiveSnapshotPayload,
} from "@/lib/live-shared";
import { LivePlayer } from "./LivePlayer";

function TheatrePanel({ snapshot }: { snapshot: LiveSnapshotPayload }) {
  return <LivePlayer snapshot={snapshot} />;
}

export function LivePublic({ initialSnapshot }: { initialSnapshot: LiveSnapshotPayload }) {
  const [mounted, setMounted] = useState(false);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const { live } = snapshot;

  async function refresh() {
    const response = await fetch("/api/live/public", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setSnapshot(data);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = window.setInterval(() => refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex flex-col gap-4 border-b border-[#ded8cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-[#596272]">DocuPeer</span>
                <span className="block text-xl font-semibold tracking-normal">DocuPeer Live</span>
              </span>
            </Link>
          </header>
          <main className="flex-1 py-8">
            <section className="overflow-hidden rounded-lg border border-[#1d2531] bg-[#090d13] shadow-[0_26px_80px_rgba(8,13,20,0.28)]">
              <div className="relative grid aspect-video w-full place-items-center bg-[#0b1017] px-5 text-center">
                <div>
                  <div className="mx-auto inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-[#d4deea]">
                    Loading
                  </div>
                  <h1 className="mt-6 text-4xl font-semibold tracking-normal text-white sm:text-6xl">
                    DocuPeer Live
                  </h1>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#ded8cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-[#596272]">DocuPeer</span>
              <span className="block text-xl font-semibold tracking-normal">DocuPeer Live</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`rounded-md border px-3 py-2 font-semibold ${live.isLive ? "border-[#bddcc9] bg-[#e8f4ec] text-[#174c33]" : "border-[#ded8cc] bg-white text-[#596272]"}`}>
              {live.isLive ? "Live now" : "Offline"}
            </span>
            <Link href="/" className="rounded-md bg-[#1f3447] px-4 py-2 font-semibold text-white transition hover:bg-[#162635]">
              Back to DocuPeer
            </Link>
          </div>
        </header>

        <main className="flex-1 py-8">
          <TheatrePanel snapshot={snapshot} />

          <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">
                {live.isLive ? "Now broadcasting" : "Current program"}
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-normal text-[#171b24] sm:text-5xl">
                {live.title}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[#3a4250]">
                {live.description}
              </p>
            </div>

            <aside className="rounded-lg border border-[#ddd7cd] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Session status</div>
              <div className="mt-2 text-2xl font-semibold">{live.isLive ? "On air" : "Standby"}</div>
              <div className="mt-5 h-px bg-[#e6e1d8]" />
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Started</div>
              <div className="mt-2 text-sm font-medium text-[#3d4553]">{formatLiveTime(live.startedAt)}</div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Last updated</div>
              <div className="mt-2 text-sm font-medium text-[#3d4553]">{formatLiveTime(live.updatedAt)}</div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
