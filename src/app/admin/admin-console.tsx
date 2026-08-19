"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  const latestUpdate = useMemo(
    () => (metrics ? new Date(metrics.updatedAt).toLocaleString() : "Loading"),
    [metrics],
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

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-[#f8f7f3] text-sm font-semibold text-[#606978]">Loading admin.</div>;
  }

  if (!authenticated) return <Login onLogin={finishLogin} />;

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
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
              </div>
            </section>

            <section className="rounded-lg border border-[#dcd6cb] bg-[#1f3447] p-5 text-white shadow-[0_18px_50px_rgba(29,33,42,0.10)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b7c7d6]">Database baseline</p>
              <div className="mt-5 space-y-3 text-sm text-[#d7e1eb]">
                <div className="flex items-center justify-between gap-4">
                  <span>Users</span>
                  <strong>{formatNumber(metrics?.realSignedUpUsers ?? 0)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Papers</span>
                  <strong>{formatNumber(metrics?.realPapersUploaded ?? 0)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Overrides</span>
                  <strong>{metrics?.overrides.signedUpUsers != null || metrics?.overrides.papersUploaded != null ? "On" : "Off"}</strong>
                </div>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
