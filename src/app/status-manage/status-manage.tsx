"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  STATUS_META,
  STATUS_PHASE_LABELS,
  STATUS_PHASES,
  formatEta,
  formatStatusPhase,
  formatStatusTime,
  type StatusLevel,
  type StatusPhase,
  type StatusSnapshotPayload,
} from "@/lib/status-shared";

const ADMIN_USERNAME = "ADMIN";
const ADMIN_PASSWORD = "12345678";
const SESSION_KEY = "docupeer-status-admin-session";
const ADMIN_HEADER = { "x-docupeer-status-admin": "browser-managed" };

function toLocalInput(value: number | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function defaultSnapshot(): StatusSnapshotPayload {
  const now = Date.now();
  return {
    status: {
      level: 1,
      phase: "",
      maintenanceMode: false,
      etaAt: null,
      updatedAt: now,
    },
    history: [],
    reports24h: [],
    olderReports: [],
    serverTime: now,
  };
}

function StatusPreview({
  snapshot,
  draft,
}: {
  snapshot: StatusSnapshotPayload;
  draft: StatusSnapshotPayload["status"];
}) {
  const meta = STATUS_META[draft.level];

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[#dcd6cb] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Public preview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#171b24]">{meta.label}</h2>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: meta.color }}>
            {meta.symbol}
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#3d4553]">{meta.sentence}</p>
        <div className="mt-5 grid gap-3">
          <div className="rounded-md bg-[#f7f5ef] px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#707887]">Phase</div>
            <div className="mt-1 font-semibold">{formatStatusPhase(draft.level, draft.phase)}</div>
          </div>
          <div className="rounded-md bg-[#f7f5ef] px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#707887]">ETA</div>
            <div className="mt-1 font-semibold">{draft.etaAt ? formatEta(draft.etaAt) : "No ETA"}</div>
          </div>
          <div className="rounded-md bg-[#f7f5ef] px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#707887]">Maintenance mode</div>
            <div className="mt-1 font-semibold">{draft.maintenanceMode ? "Redirecting traffic" : "Off"}</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#dcd6cb] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-normal text-[#171b24]">24-hour record</h2>
          <span className="text-xs font-medium text-[#707887]">{snapshot.history.length || 288} buckets</span>
        </div>
        <div className="grid h-16 grid-cols-[repeat(288,minmax(1px,1fr))] gap-px overflow-hidden rounded-md border border-[#ded8cc] bg-[#ded8cc]">
          {snapshot.history.length ? snapshot.history.map((item) => (
            <span key={item.bucketTs} style={{ background: STATUS_META[item.statusLevel].color }} />
          )) : Array.from({ length: 288 }, (_, index) => (
            <span key={index} style={{ background: STATUS_META[draft.level].color }} />
          ))}
        </div>
      </section>
    </aside>
  );
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
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
          <span className="font-semibold">DocuPeer Status</span>
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-normal">Manage service status</h1>
        <p className="mt-2 text-sm leading-6 text-[#606978]">Use the temporary browser-side credentials to update public availability and maintenance mode.</p>
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

export function StatusManage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [snapshot, setSnapshot] = useState<StatusSnapshotPayload>(() => defaultSnapshot());
  const [draft, setDraft] = useState(defaultSnapshot().status);
  const [report, setReport] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = STATUS_META[draft.level];

  const recentReports = useMemo(
    () => [...snapshot.reports24h, ...snapshot.olderReports].slice(0, 6),
    [snapshot.olderReports, snapshot.reports24h],
  );

  async function loadData() {
    const response = await fetch("/api/status-manage/data", {
      cache: "no-store",
      headers: ADMIN_HEADER,
    });
    if (!response.ok) throw new Error("Could not load status controls.");
    const data = await response.json();
    setSnapshot(data);
    setDraft(data.status);
  }

  useEffect(() => {
    if (window.localStorage.getItem(SESSION_KEY) === "1") {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadData().catch((err) => setMessage(err.message || "Could not load status controls."));
  }, [authenticated]);

  function updateDraft(partial: Partial<typeof draft>) {
    setDraft((current) => {
      const next = { ...current, ...partial };
      if (next.level <= 1) next.phase = "";
      if (next.level > 1 && !next.phase) next.phase = "investigating";
      return next;
    });
  }

  async function saveState() {
    setBusy(true);
    setMessage("Saving status...");
    try {
      const response = await fetch("/api/status-manage/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...ADMIN_HEADER,
        },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save status.");
      setSnapshot(payload.data);
      setDraft(payload.data.status);
      setMessage("Status saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save status.");
    } finally {
      setBusy(false);
    }
  }

  async function postReport() {
    if (!report.trim()) {
      setMessage("Write an update before posting.");
      return;
    }
    setBusy(true);
    setMessage("Posting update...");
    try {
      const response = await fetch("/api/status-manage/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...ADMIN_HEADER,
        },
        body: JSON.stringify({ message: report }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not post update.");
      setSnapshot(payload.data);
      setDraft(payload.data.status);
      setReport("");
      setMessage("Update posted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not post update.");
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#ded8cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#596272]">Status operations</div>
              <h1 className="text-2xl font-semibold tracking-normal">Manage DocuPeer availability</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-md border border-[#d6d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
              Public page
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

        <main className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-8">
            <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Current controls</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">Set the public state</h2>
                </div>
                <button
                  onClick={saveState}
                  disabled={busy}
                  className="rounded-md bg-[#1f3447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:opacity-50"
                  type="button"
                >
                  Save status
                </button>
              </div>

              <div className="mt-7 grid gap-4">
                {([1, 2, 3, 4, 5] as StatusLevel[]).map((level) => {
                  const item = STATUS_META[level];
                  const active = draft.level === level;
                  return (
                    <button
                      key={level}
                      onClick={() => updateDraft({ level })}
                      type="button"
                      className={`grid gap-3 rounded-lg border p-4 text-left transition sm:grid-cols-[3rem_minmax(0,1fr)] ${
                        active ? "border-[#1f3447] bg-[#f2f5f7] shadow-[inset_0_0_0_1px_#1f3447]" : "border-[#e1dbd1] bg-[#fbfaf7] hover:border-[#b9b1a4]"
                      }`}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-md text-xs font-bold text-white" style={{ background: item.color }}>
                        {level}
                      </span>
                      <span>
                        <span className="block font-semibold text-[#171b24]">{item.label}</span>
                        <span className="mt-1 block text-sm leading-6 text-[#606978]">{item.sentence}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <div className={draft.level <= 1 ? "opacity-45" : ""}>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Incident phase</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {STATUS_PHASES.map((phase) => (
                      <button
                        key={phase}
                        type="button"
                        disabled={draft.level <= 1}
                        onClick={() => updateDraft({ phase })}
                        className={`rounded-md border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                          draft.phase === phase ? "border-[#1f3447] bg-[#1f3447] text-white" : "border-[#d6d0c5] bg-white text-[#2d3342] hover:border-[#1f3447]"
                        }`}
                      >
                        {STATUS_PHASE_LABELS[phase as Exclude<StatusPhase, "">]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">ETA</span>
                    <input
                      type="datetime-local"
                      value={toLocalInput(draft.etaAt)}
                      onChange={(event) => updateDraft({ etaAt: fromLocalInput(event.target.value) })}
                      className="mt-3 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => updateDraft({ etaAt: null })}
                    className="rounded-md border border-[#d6d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]"
                  >
                    Clear ETA
                  </button>
                </div>
              </div>

              <label className="mt-8 flex cursor-pointer flex-col gap-4 rounded-lg border border-[#d6d0c5] bg-[#fbfaf7] p-4 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block font-semibold">Route visitors to the status page</span>
                  <span className="mt-1 block text-sm leading-6 text-[#606978]">When enabled, the main site will redirect public traffic to the status domain.</span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.maintenanceMode}
                  onChange={(event) => updateDraft({ maintenanceMode: event.target.checked })}
                  className="h-6 w-6 accent-[#1f3447]"
                />
              </label>

              {message ? (
                <div className="mt-6 rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-3 text-sm font-semibold text-[#2d3342]">
                  {message}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Incident log</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">Post an update</h2>
                </div>
                <span className="rounded-md px-3 py-2 text-sm font-semibold" style={{ background: meta.softColor, color: meta.textColor }}>
                  Posting as {meta.label}
                </span>
              </div>
              <textarea
                value={report}
                onChange={(event) => setReport(event.target.value)}
                rows={6}
                className="mt-5 w-full resize-y rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                placeholder="Example: We have identified elevated latency in the review workflow and are monitoring recovery."
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-[#606978]">{Math.min(report.length, 4000)} / 4000 characters</span>
                <button
                  onClick={postReport}
                  disabled={busy}
                  type="button"
                  className="rounded-md bg-[#1f3447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:opacity-50"
                >
                  Post update
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <h2 className="text-2xl font-semibold tracking-normal">Latest posted updates</h2>
              <div className="mt-5 divide-y divide-[#e6e1d8] overflow-hidden rounded-lg border border-[#e0dbd2]">
                {recentReports.length ? recentReports.map((item) => (
                  <article key={item.id} className="px-4 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-semibold">{STATUS_META[item.statusLevel].label}</span>
                      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#707887]">{formatStatusTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#3d4553]">{item.message}</p>
                  </article>
                )) : (
                  <div className="px-4 py-8 text-sm text-[#606978]">No updates have been posted yet.</div>
                )}
              </div>
            </section>
          </div>

          <StatusPreview snapshot={snapshot} draft={draft} />
        </main>
      </div>
    </div>
  );
}
