"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { JitsiStage } from "@/app/live/JitsiStage";
import {
  DEFAULT_LIVE_DESCRIPTION,
  DEFAULT_LIVE_TITLE,
  createLiveRoomName,
  formatLiveTime,
  type LiveSnapshotPayload,
} from "@/lib/live-shared";

const ADMIN_USERNAME = "ADMIN";
const ADMIN_PASSWORD = "12345678";
const SESSION_KEY = "docupeer-live-admin-session";
const ADMIN_HEADER = { "x-docupeer-live-admin": "browser-managed" };

function defaultSnapshot(): LiveSnapshotPayload {
  const now = Date.now();
  return {
    live: {
      isLive: false,
      title: DEFAULT_LIVE_TITLE,
      description: DEFAULT_LIVE_DESCRIPTION,
      roomName: createLiveRoomName(),
      startedAt: null,
      endedAt: null,
      updatedAt: now,
    },
    serverTime: now,
  };
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      window.localStorage.setItem(SESSION_KEY, "1");
      setMessage("");
      onLogin();
      return;
    }
    setMessage("Those credentials do not match.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f7f3] px-5 py-10 text-[#171b24]">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_24px_70px_rgba(29,33,42,0.10)]">
        <Link href="/live" className="inline-flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
          <span className="font-semibold">DocuPeer Live</span>
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-normal">Manage live broadcast</h1>
        <p className="mt-2 text-sm leading-6 text-[#606978]">Sign in to update the public live room, session title, description, and broadcast state.</p>
        <div className="mt-7 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15" autoComplete="username" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15" autoComplete="current-password" />
          </label>
        </div>
        {message ? <div className="mt-4 rounded-md border border-[#e7bbc3] bg-[#fff1f3] px-3 py-2 text-sm font-medium text-[#842839]">{message}</div> : null}
        <button className="mt-6 w-full rounded-md bg-[#1f3447] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#162635]" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}

export function LiveManage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveSnapshotPayload>(() => defaultSnapshot());
  const [draft, setDraft] = useState(defaultSnapshot().live);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [hostRoomActive, setHostRoomActive] = useState(false);

  const dirty = useMemo(
    () =>
      draft.title !== snapshot.live.title ||
      draft.description !== snapshot.live.description ||
      draft.roomName !== snapshot.live.roomName ||
      draft.isLive !== snapshot.live.isLive,
    [draft, snapshot.live],
  );

  async function loadData() {
    const response = await fetch("/api/live-manage/state", {
      cache: "no-store",
      headers: ADMIN_HEADER,
    });
    if (!response.ok) throw new Error("Could not load live controls.");
    const data = await response.json();
    setSnapshot(data);
    setDraft(data.live);
    setHostRoomActive(data.live.isLive);
  }

  useEffect(() => {
    if (window.localStorage.getItem(SESSION_KEY) === "1") {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadData().catch((err) => setMessage(err.message || "Could not load live controls."));
  }, [authenticated]);

  async function save(nextDraft = draft) {
    setBusy(true);
    setMessage("Saving live settings...");
    try {
      const response = await fetch("/api/live-manage/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...ADMIN_HEADER,
        },
        body: JSON.stringify(nextDraft),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save live settings.");
      setSnapshot(payload.data);
      setDraft(payload.data.live);
      setHostRoomActive(payload.data.live.isLive);
      setMessage(payload.data.live.isLive ? "Live broadcast is on." : "Live broadcast is off.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save live settings.");
    } finally {
      setBusy(false);
    }
  }

  function setLive(isLive: boolean) {
    const next = { ...draft, isLive };
    setDraft(next);
    save(next);
  }

  function rotateRoom() {
    const nextRoom = createLiveRoomName();
    setDraft((current) => ({ ...current, roomName: nextRoom }));
    setHostRoomActive(false);
    setMessage("New room created. Save before going live.");
  }

  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
      <div className="mx-auto w-full max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#ded8cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#596272]">Broadcast operations</div>
              <h1 className="text-2xl font-semibold tracking-normal">DocuPeer Live console</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/live" className="rounded-md border border-[#d6d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
              Public live page
            </Link>
            <button
              onClick={() => {
                window.localStorage.removeItem(SESSION_KEY);
                setAuthenticated(false);
              }}
              className="rounded-md bg-[#1f3447] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#162635]"
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="grid gap-8 py-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-8">
            <section>
              <JitsiStage roomName={draft.roomName} title={draft.title} mode="host" active={hostRoomActive} />
            </section>

            <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Public broadcast</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">{draft.isLive ? "Live is on" : "Live is off"}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#606978]">The public page uses this room and metadata. Join the host room, press share, then turn live on when the feed is ready.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setHostRoomActive((value) => !value)}
                    className="rounded-md border border-[#d6d0c5] bg-white px-4 py-3 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]"
                  >
                    {hostRoomActive ? "Close host room" : "Open host room"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLive(!draft.isLive)}
                    disabled={busy}
                    className={`rounded-md px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${draft.isLive ? "bg-[#842839] hover:bg-[#6e1f2e]" : "bg-[#174c33] hover:bg-[#113b27]"}`}
                  >
                    {draft.isLive ? "Turn live off" : "Go live"}
                  </button>
                </div>
              </div>

              <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-5">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Live title</span>
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                      maxLength={120}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Description shown under theatre</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                      rows={5}
                      className="mt-2 w-full resize-y rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                      maxLength={800}
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-[#ded8cc] bg-[#fbfaf7] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Room</div>
                  <div className="mt-2 break-all font-mono text-sm text-[#2d3342]">{draft.roomName}</div>
                  <button
                    type="button"
                    onClick={rotateRoom}
                    className="mt-4 w-full rounded-md border border-[#d6d0c5] bg-white px-3 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]"
                  >
                    New private room
                  </button>
                  <div className="mt-5 h-px bg-[#e6e1d8]" />
                  <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Started</div>
                  <div className="mt-2 text-sm font-medium text-[#3d4553]">{formatLiveTime(snapshot.live.startedAt)}</div>
                  <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Updated</div>
                  <div className="mt-2 text-sm font-medium text-[#3d4553]">{formatLiveTime(snapshot.live.updatedAt)}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-[#606978]">{dirty ? "Unsaved edits" : "Settings saved"}</div>
                <button
                  type="button"
                  onClick={() => save()}
                  disabled={busy}
                  className="rounded-md bg-[#1f3447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:opacity-50"
                >
                  Save details
                </button>
              </div>

              {message ? (
                <div className="mt-5 rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-3 text-sm font-semibold text-[#2d3342]">
                  {message}
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-[#dcd6cb] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Public preview</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{draft.title || DEFAULT_LIVE_TITLE}</h2>
              <p className="mt-4 text-sm leading-6 text-[#3d4553]">{draft.description || DEFAULT_LIVE_DESCRIPTION}</p>
              <div className="mt-5 rounded-md bg-[#f7f5ef] px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#707887]">Audience sees</div>
                <div className="mt-1 font-semibold">{draft.isLive ? "Live theatre" : "Offline holding screen"}</div>
              </div>
            </section>

            <section className="rounded-lg border border-[#dcd6cb] bg-[#1f3447] p-5 text-white shadow-[0_18px_50px_rgba(29,33,42,0.10)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b7c7d6]">Broadcast checklist</p>
              <div className="mt-5 space-y-3 text-sm text-[#d7e1eb]">
                <div className="flex items-center justify-between gap-4">
                  <span>Host room open</span>
                  <strong>{hostRoomActive ? "Yes" : "No"}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Details saved</span>
                  <strong>{dirty ? "No" : "Yes"}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Public state</span>
                  <strong>{draft.isLive ? "Live" : "Offline"}</strong>
                </div>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
