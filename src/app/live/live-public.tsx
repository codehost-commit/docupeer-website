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
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewerCountDraft, setViewerCountDraft] = useState(String(initialSnapshot.live.viewerCount));
  const [saveMessage, setSaveMessage] = useState("");
  const { live } = snapshot;

  async function refresh(shouldSyncDraft = !editorOpen) {
    const response = await fetch("/api/live/public", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setSnapshot(data);
    if (shouldSyncDraft) setViewerCountDraft(String(data.live.viewerCount));
  }

  useEffect(() => {
    const timer = window.setInterval(() => refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [editorOpen]);

  useEffect(() => {
    const pressed = new Set<string>();

    function maybeOpenEditor() {
      if (
        (pressed.has("ShiftLeft") || pressed.has("ShiftRight")) &&
        pressed.has("KeyP") &&
        pressed.has("Digit3")
      ) {
        setEditorOpen(true);
      }
    }

    function down(event: KeyboardEvent) {
      pressed.add(event.code);
      maybeOpenEditor();
    }

    function up(event: KeyboardEvent) {
      pressed.delete(event.code);
    }

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  async function saveViewerCount() {
    setSaveMessage("Saving...");
    const response = await fetch("/api/live/viewer-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewerCount: viewerCountDraft }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaveMessage(payload.error || "Could not save viewer count.");
      return;
    }
    setSnapshot(payload.data);
    setViewerCountDraft(String(payload.data.live.viewerCount));
    setSaveMessage("Saved.");
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
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Viewers</div>
              <div className="mt-2 text-2xl font-semibold">{live.viewerCount.toLocaleString()}</div>
              {editorOpen ? (
                <div className="mt-4 rounded-md border border-[#d6d0c5] bg-[#fbfaf7] p-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#707887]">Testing count</span>
                    <input
                      value={viewerCountDraft}
                      onChange={(event) => setViewerCountDraft(event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                      inputMode="numeric"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveViewerCount}
                      className="rounded-md bg-[#1f3447] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#162635]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorOpen(false)}
                      className="rounded-md border border-[#d6d0c5] bg-white px-3 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]"
                    >
                      Hide
                    </button>
                  </div>
                  {saveMessage ? <div className="mt-2 text-xs font-semibold text-[#606978]">{saveMessage}</div> : null}
                </div>
              ) : null}
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
