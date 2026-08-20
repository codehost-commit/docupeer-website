"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LaunchCelebration } from "@/app/components/LaunchCelebration";
import {
  FEATURE_LAUNCH_LABEL,
  defaultLaunchSnapshot,
  launchTimeParts,
  type LaunchSnapshot,
} from "@/lib/launch-shared";
import {
  TPT_CATEGORIES,
  TPT_CATEGORY_META,
  type TptAdminItem,
  type TptCategory,
} from "@/lib/tpt-shared";

type AdminMetrics = {
  pageViews: number;
  signedUpUsers: number;
  papersUploaded: number;
  realSignedUpUsers: number;
  realPapersUploaded: number;
  overrides: {
    signedUpUsers: number | null;
    papersUploaded: number | null;
  };
  updatedAt: number;
};

type DraftMetrics = {
  pageViews: string;
  signedUpUsers: string;
  papersUploaded: string;
};

type TalkFilter = "all" | "pending" | "approved";

const DEV_EDIT_SEQUENCE = ["P", "G", "#"];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function metricDraft(metrics: AdminMetrics): DraftMetrics {
  return {
    pageViews: String(metrics.pageViews),
    signedUpUsers: String(metrics.signedUpUsers),
    papersUploaded: String(metrics.papersUploaded),
  };
}

function parseMetric(value: string) {
  const parsed = Math.floor(Number(value.replace(/[^\d]/g, "")));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatAdminDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not sign in.");
      onLogin();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f7f3] px-5 py-10 text-[#171b24]">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_24px_70px_rgba(29,33,42,0.10)]">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
          <span className="font-semibold">DocuPeer Admin</span>
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-normal">Admin sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[#606978]">Use the temporary admin credentials to view site metrics and operations controls.</p>
        <div className="mt-7 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">User ID</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
              autoComplete="current-password"
            />
          </label>
        </div>
        {message ? <div className="mt-4 rounded-md border border-[#e7bbc3] bg-[#fff1f3] px-3 py-2 text-sm font-medium text-[#842839]">{message}</div> : null}
        <button
          className="mt-6 w-full rounded-md bg-[#1f3447] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <section className="rounded-lg border border-[#dcd6cb] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">{label}</p>
      <div className="mt-4 text-4xl font-semibold tracking-normal text-[#171b24] sm:text-5xl">{formatNumber(value)}</div>
    </section>
  );
}

export function AdminConsole() {
  const router = useRouter();
  const params = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [devAccess, setDevAccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [draft, setDraft] = useState<DraftMetrics | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [talkItems, setTalkItems] = useState<TptAdminItem[]>([]);
  const [talkFilter, setTalkFilter] = useState<TalkFilter>("pending");
  const [talkDrafts, setTalkDrafts] = useState<Record<string, TptCategory>>({});
  const [talkMessage, setTalkMessage] = useState("");
  const [talkBusyId, setTalkBusyId] = useState<string | null>(null);
  const [launch, setLaunch] = useState<LaunchSnapshot>(defaultLaunchSnapshot());
  const [launchNow, setLaunchNow] = useState(() => Date.now());
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchArmed, setLaunchArmed] = useState(false);
  const [launchCelebrating, setLaunchCelebrating] = useState(false);
  const [launchMessage, setLaunchMessage] = useState("");
  const launchCountdown = launchTimeParts(launch.targetAt, launchNow);

  const latestUpdate = useMemo(
    () => (metrics ? new Date(metrics.updatedAt).toLocaleString() : "Loading"),
    [metrics],
  );
  const talkCounts = useMemo(
    () => ({
      all: talkItems.length,
      pending: talkItems.filter((item) => item.status === "pending").length,
      approved: talkItems.filter((item) => item.status === "approved").length,
    }),
    [talkItems],
  );
  const visibleTalkItems = useMemo(
    () => talkItems.filter((item) => talkFilter === "all" || item.status === talkFilter),
    [talkFilter, talkItems],
  );
  const nextPath = params.get("next");

  function finishLogin() {
    checkSession();
    if (nextPath === "/live-manage" || nextPath === "/status-manage") {
      router.push(nextPath);
    }
  }

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/me", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Not signed in.");
      setAuthenticated(true);
      setDevAccess(!!payload.devAccess);
    } catch {
      setAuthenticated(false);
      setDevAccess(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    const response = await fetch("/api/admin/metrics", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not load metrics.");
    setMetrics(payload.metrics);
    setDraft(metricDraft(payload.metrics));
  }, []);

  const loadTalkItems = useCallback(async () => {
    const response = await fetch("/api/admin/tpt", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not load TPT submissions.");
    const items: TptAdminItem[] = Array.isArray(payload.items) ? payload.items : [];
    setTalkItems(items);
    setTalkDrafts((current) => {
      const next: Record<string, TptCategory> = {};
      for (const item of items) {
        next[item.id] = current[item.id] ?? item.category ?? item.suggestedCategory ?? "love";
      }
      return next;
    });
  }, []);

  const loadLaunch = useCallback(async () => {
    const response = await fetch("/api/admin/launch", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not load launch state.");
    setLaunch(payload.launch);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!authenticated) return;
    loadMetrics().catch((err) => setMessage(err.message || "Could not load metrics."));
    const id = window.setInterval(() => {
      loadMetrics().catch(() => {});
    }, 10_000);
    return () => window.clearInterval(id);
  }, [authenticated, loadMetrics]);

  useEffect(() => {
    if (!authenticated) return;
    loadTalkItems().catch((err) => setTalkMessage(err.message || "Could not load TPT submissions."));
    const id = window.setInterval(() => {
      loadTalkItems().catch(() => {});
    }, 15_000);
    return () => window.clearInterval(id);
  }, [authenticated, loadTalkItems]);

  useEffect(() => {
    if (!authenticated) return;
    loadLaunch().catch((err) => setLaunchMessage(err.message || "Could not load launch state."));
    const poll = window.setInterval(() => loadLaunch().catch(() => {}), 5000);
    const clock = window.setInterval(() => setLaunchNow(Date.now()), 250);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [authenticated, loadLaunch]);

  useEffect(() => {
    if (!authenticated) return;
    let sequence: string[] = [];

    async function unlockAccess() {
      try {
        const ipResponse = await fetch("https://icanhazip.com/", {
          cache: "no-store",
        });
        const address = (await ipResponse.text()).trim();
        const response = await fetch("/api/admin/dev-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        if (response.ok) {
          setDevAccess(true);
          await checkSession();
        }
      } catch {
        // Silent by design.
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (event.key === "\\") {
        unlockAccess();
        sequence = [];
        return;
      }
      if (!devAccess) return;

      const key = event.shiftKey && event.key === "3" ? "#" : event.key;
      sequence = [...sequence, key].slice(-DEV_EDIT_SEQUENCE.length);
      if (DEV_EDIT_SEQUENCE.every((part, index) => sequence[index] === part)) {
        setEditMode(true);
        sequence = [];
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authenticated, checkSession, devAccess]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setDevAccess(false);
    setEditMode(false);
    setMetrics(null);
    setDraft(null);
  }

  async function saveMetrics() {
    if (!draft) return;
    setBusy(true);
    setMessage("Saving metrics...");
    try {
      const response = await fetch("/api/admin/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageViews: parseMetric(draft.pageViews),
          signedUpUsers: parseMetric(draft.signedUpUsers),
          papersUploaded: parseMetric(draft.papersUploaded),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save metrics.");
      setMetrics(payload.metrics);
      setDraft(metricDraft(payload.metrics));
      setMessage("Metrics saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save metrics.");
    } finally {
      setBusy(false);
    }
  }

  async function executeLaunch() {
    setLaunchBusy(true);
    setLaunchMessage("Sending the global launch signal...");
    try {
      const response = await fetch("/api/admin/launch", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The launch signal failed.");
      setLaunch(payload.launch);
      setLaunchArmed(false);
      setLaunchCelebrating(true);
      setLaunchMessage("Launch signal confirmed. DocuPeer is live.");
    } catch (error) {
      setLaunchMessage(error instanceof Error ? error.message : "The launch signal failed.");
    } finally {
      setLaunchBusy(false);
    }
  }

  function applyTalkItem(item: TptAdminItem) {
    setTalkItems((current) => current.map((existing) => existing.id === item.id ? item : existing));
    setTalkDrafts((current) => ({ ...current, [item.id]: item.category }));
  }

  async function approveTalkItem(item: TptAdminItem) {
    setTalkBusyId(item.id);
    setTalkMessage("Approving TPT submission...");
    try {
      const response = await fetch(`/api/admin/tpt/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: talkDrafts[item.id] ?? item.suggestedCategory ?? item.category,
          featured: item.featured,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not approve submission.");
      applyTalkItem(payload.item);
      setTalkMessage("TPT submission approved.");
    } catch (err) {
      setTalkMessage(err instanceof Error ? err.message : "Could not approve submission.");
    } finally {
      setTalkBusyId(null);
    }
  }

  async function deleteTalkItem(item: TptAdminItem) {
    setTalkBusyId(item.id);
    setTalkMessage(item.status === "pending" ? "Denying TPT submission..." : "Removing TPT submission...");
    try {
      const response = await fetch(`/api/admin/tpt/${item.id}/reject`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not remove submission.");
      setTalkItems((current) => current.filter((existing) => existing.id !== item.id));
      setTalkMessage(item.status === "pending" ? "TPT submission denied and deleted." : "TPT submission removed.");
    } catch (err) {
      setTalkMessage(err instanceof Error ? err.message : "Could not remove submission.");
    } finally {
      setTalkBusyId(null);
    }
  }

  async function toggleFeaturedTalkItem(item: TptAdminItem) {
    setTalkBusyId(item.id);
    setTalkMessage(item.featured ? "Removing featured status..." : "Featuring TPT submission...");
    try {
      const response = await fetch(`/api/admin/tpt/${item.id}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !item.featured }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not update featured status.");
      applyTalkItem(payload.item);
      setTalkMessage(payload.item.featured ? "TPT submission featured." : "Featured status removed.");
    } catch (err) {
      setTalkMessage(err instanceof Error ? err.message : "Could not update featured status.");
    } finally {
      setTalkBusyId(null);
    }
  }

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-[#f8f7f3] text-sm font-semibold text-[#606978]">Loading admin.</div>;
  }

  if (!authenticated) return <Login onLogin={finishLogin} />;

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
      <LaunchCelebration active={launchCelebrating} onComplete={() => setLaunchCelebrating(false)} />
      {launchArmed && !launch.isLaunched ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#030810]/95 px-5 py-10 text-white backdrop-blur-xl">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[#ffd166]/35 bg-[#091522] p-7 text-center shadow-[0_0_120px_rgba(255,209,102,0.16)] sm:p-12">
            <div className="launch-aurora absolute inset-0 opacity-40" />
            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#ffd166]/40 bg-[#ffd166]/10 text-2xl shadow-[0_0_45px_rgba(255,209,102,0.2)]">✦</div>
              <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.45em] text-[#ffd166]">Final authorization</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-normal text-white sm:text-6xl">Ready to make history?</h2>
              <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-white/60">This opens registration and every product surface immediately. Everyone on the countdown page will receive the live reveal.</p>
              <button
                type="button"
                onClick={executeLaunch}
                disabled={launchBusy}
                className="launch-admin-button mt-9 w-full rounded-2xl border border-[#ffe39b] bg-gradient-to-b from-[#ffe39b] to-[#e5aa31] px-6 py-5 text-base font-black uppercase tracking-[0.22em] text-[#151007] shadow-[0_0_50px_rgba(255,209,102,0.26)] transition hover:scale-[1.015] hover:shadow-[0_0_80px_rgba(255,209,102,0.42)] disabled:opacity-60"
              >
                {launchBusy ? "Transmitting signal..." : "Launch DocuPeer"}
              </button>
              <button type="button" onClick={() => setLaunchArmed(false)} disabled={launchBusy} className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/45 transition hover:text-white">Return to console</button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#ded8cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f3447] text-sm font-bold text-white">DP</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#596272]">Admin operations</div>
              <h1 className="text-2xl font-semibold tracking-normal">DocuPeer admin</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-md border border-[#d6d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
              Public page
            </Link>
            <Link href="/tpt" className="rounded-md border border-[#d6d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
              TPT
            </Link>
            <Link href="/live-manage" className="rounded-md border border-[#d6d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
              Live console
            </Link>
            <Link href="/status-manage" className="rounded-md border border-[#d6d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
              Status console
            </Link>
            <button
              onClick={logout}
              className="rounded-md bg-[#1f3447] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#162635]"
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="grid gap-8 py-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="space-y-8">
            <section className="relative isolate overflow-hidden rounded-2xl border border-[#1d3449] bg-[#07111c] p-6 text-white shadow-[0_24px_70px_rgba(7,17,28,0.24)] sm:p-8">
              <div className="launch-aurora absolute inset-0 opacity-50" />
              <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffd166]">
                    <span className={`h-2 w-2 rounded-full ${launch.isLaunched ? "bg-emerald-400 shadow-[0_0_14px_#34d399]" : "animate-pulse bg-red-500 shadow-[0_0_14px_#ef4444]"}`} />
                    Feature launch control
                  </div>
                  <h2 className="mt-4 text-4xl font-semibold tracking-normal text-white sm:text-5xl">{launch.isLaunched ? "DocuPeer is live." : "The final signal."}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                    {launch.isLaunched
                      ? `Global launch confirmed${launch.launchedAt ? ` at ${new Date(launch.launchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : ""}. Registration and product routes are open.`
                      : "This is the master release control. It unlocks registration and the complete DocuPeer experience for everyone watching."}
                  </p>
                  {!launch.isLaunched ? (
                    <div className="mono mt-6 flex flex-wrap gap-x-5 gap-y-2 text-2xl tabular-nums text-white sm:text-3xl">
                      <span>{String(launchCountdown.days).padStart(2, "0")}<small className="ml-1 text-[9px] uppercase tracking-widest text-white/35">d</small></span>
                      <span>{String(launchCountdown.hours).padStart(2, "0")}<small className="ml-1 text-[9px] uppercase tracking-widest text-white/35">h</small></span>
                      <span>{String(launchCountdown.minutes).padStart(2, "0")}<small className="ml-1 text-[9px] uppercase tracking-widest text-white/35">m</small></span>
                      <span>{String(launchCountdown.seconds).padStart(2, "0")}<small className="ml-1 text-[9px] uppercase tracking-widest text-white/35">s</small></span>
                    </div>
                  ) : null}
                  <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{FEATURE_LAUNCH_LABEL}</div>
                  {launchMessage ? <div className="mt-5 text-sm font-semibold text-[#ffd166]">{launchMessage}</div> : null}
                </div>
                {launch.isLaunched ? (
                  <Link href="/" className="inline-flex rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-6 py-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-300/20">View the live site →</Link>
                ) : (
                  <button type="button" onClick={() => setLaunchArmed(true)} className="launch-admin-button rounded-xl border border-[#ffe39b] bg-gradient-to-b from-[#ffe39b] to-[#dfa328] px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-[#151007] shadow-[0_0_40px_rgba(255,209,102,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(255,209,102,0.36)]">Arm launch sequence</button>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Overview</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">Site metrics</h2>
                </div>
                <span className="text-sm font-medium text-[#606978]">Updated {latestUpdate}</span>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Page views"
                  value={metrics?.pageViews ?? 0}
                />
                <MetricCard
                  label="Signed-up users"
                  value={metrics?.signedUpUsers ?? 0}
                />
                <MetricCard
                  label="Papers uploaded"
                  value={metrics?.papersUploaded ?? 0}
                />
              </div>
            </section>

            <section id="tpt-moderation" className="scroll-mt-8 rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">The People's Talk</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">Moderation queue</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#606978]">
                    Accept publishes to the public TPT wall. Deny deletes the submission.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadTalkItems().catch((err) => setTalkMessage(err.message || "Could not refresh TPT submissions."))}
                  className="rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-3 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {([
                  ["pending", `Pending (${talkCounts.pending})`],
                  ["approved", `Approved (${talkCounts.approved})`],
                  ["all", `All (${talkCounts.all})`],
                ] as const).map(([filter, label]) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTalkFilter(filter)}
                    className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                      talkFilter === filter
                        ? "bg-[#1f3447] text-white"
                        : "border border-[#d6d0c5] bg-[#fbfaf7] text-[#2d3342] hover:border-[#1f3447]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {talkMessage ? (
                <div className="mt-5 rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-3 text-sm font-semibold text-[#2d3342]">
                  {talkMessage}
                </div>
              ) : null}

              <div className="mt-6 space-y-4">
                {visibleTalkItems.length ? (
                  visibleTalkItems.map((item) => (
                    <article key={item.id} className="rounded-lg border border-[#dcd6cb] bg-[#fbfaf7] p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                              item.status === "approved"
                                ? "bg-[#e8f4ec] text-[#2f6945]"
                                : "bg-[#fff7e7] text-[#76551d]"
                            }`}>
                              {item.status === "approved" ? "Approved" : "Pending"}
                            </span>
                            <span className="rounded-md bg-[#1f3447] px-2.5 py-1 text-xs font-semibold text-white">
                              {item.rating} / 5
                            </span>
                            <span className="rounded-md border border-[#d6d0c5] bg-white px-2.5 py-1 text-xs font-semibold text-[#596272]">
                              {TPT_CATEGORY_META[item.category].shortLabel}
                            </span>
                            {item.featured ? (
                              <span className="rounded-md border border-[#c5a86d] bg-[#fff8e6] px-2.5 py-1 text-xs font-semibold text-[#74561a]">
                                Featured
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-4 text-xl font-semibold tracking-normal text-[#171b24]">
                            {item.title || "Untitled TPT note"}
                          </h3>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#2d3342]">
                            {item.body}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-[0.12em] text-[#717784]">
                            <span>{item.publicName}</span>
                            <span>Created {formatAdminDate(item.createdAt)}</span>
                            <span>Published {formatAdminDate(item.approvedAt)}</span>
                          </div>
                        </div>

                        <div className="grid shrink-0 gap-2 sm:min-w-56">
                          {item.status === "pending" ? (
                            <select
                              value={talkDrafts[item.id] ?? item.suggestedCategory ?? item.category}
                              onChange={(event) => setTalkDrafts((current) => ({ ...current, [item.id]: event.target.value as TptCategory }))}
                              className="rounded-md border border-[#d6d0c5] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                            >
                              {TPT_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                  {TPT_CATEGORY_META[category].label}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {item.status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => approveTalkItem(item)}
                              disabled={talkBusyId === item.id}
                              className="rounded-md bg-[#1f3447] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:opacity-50"
                            >
                              Accept and publish
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleFeaturedTalkItem(item)}
                              disabled={talkBusyId === item.id}
                              className="rounded-md border border-[#d6d0c5] bg-white px-4 py-3 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447] disabled:opacity-50"
                            >
                              {item.featured ? "Unfeature" : "Feature"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteTalkItem(item)}
                            disabled={talkBusyId === item.id}
                            className="rounded-md border border-[#e3b8bf] bg-[#fff4f5] px-4 py-3 text-sm font-semibold text-[#842839] transition hover:border-[#842839] disabled:opacity-50"
                          >
                            {item.status === "pending" ? "Deny and delete" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#cfc8bc] bg-[#fbfaf7] px-4 py-8 text-center text-sm font-medium text-[#606978]">
                    No TPT submissions in this filter yet.
                  </div>
                )}
              </div>
            </section>

            {editMode && draft ? (
              <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Display metrics</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-normal">Edit values</h2>
                  </div>
                  <button
                    type="button"
                    onClick={saveMetrics}
                    disabled={busy}
                    className="rounded-md bg-[#1f3447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:opacity-50"
                  >
                    Save metrics
                  </button>
                </div>
                <div className="mt-7 grid gap-5 md:grid-cols-3">
                  {([
                    ["pageViews", "Page views"],
                    ["signedUpUsers", "Signed-up users"],
                    ["papersUploaded", "Papers uploaded"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#707887]">{label}</span>
                      <input
                        value={draft[key]}
                        onChange={(event) => setDraft((current) => current ? { ...current, [key]: event.target.value } : current)}
                        inputMode="numeric"
                        className="mt-2 w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            {message ? (
              <div className="rounded-md border border-[#d6d0c5] bg-white px-4 py-3 text-sm font-semibold text-[#2d3342] shadow-[0_12px_30px_rgba(29,33,42,0.05)]">
                {message}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-[#dcd6cb] bg-white p-5 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Operations</p>
              <div className="mt-5 grid gap-3">
                <Link href="/live-manage" className="rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
                  Open Live console
                </Link>
                <Link href="/status-manage" className="rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
                  Open Status console
                </Link>
                <Link href="/tpt" className="rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
                  Open TPT public wall
                </Link>
                <a href="#tpt-moderation" className="rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]">
                  Review TPT submissions
                </a>
              </div>
            </section>

          </aside>
        </main>
      </div>
    </div>
  );
}
