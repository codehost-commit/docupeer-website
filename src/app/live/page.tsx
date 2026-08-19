import type { Metadata } from "next";
import Link from "next/link";
import { getLiveSnapshot } from "@/lib/live";
import { formatLiveTime } from "@/lib/live-shared";
import { JitsiStage } from "./JitsiStage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DocuPeer Live",
  description: "Watch live DocuPeer sessions, screen shares, and team updates.",
};

export default async function LivePage() {
  const snapshot = await getLiveSnapshot();
  const { live } = snapshot;

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
          <section>
            <JitsiStage roomName={live.roomName} title={live.title} mode="viewer" active={live.isLive} />
          </section>

          <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">
                {live.isLive ? "Now broadcasting" : "Current program"}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#171b24] sm:text-5xl">
                {live.title}
              </h1>
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
