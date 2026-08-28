"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdminMetrics = {
  pageViews: number;
  users: number;
  papersUploaded: number;
  updatedAt: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
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
        <p className="mt-2 text-sm leading-6 text-[#606978]">View site metrics.</p>
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
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [message, setMessage] = useState("");

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
      await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Not signed in.");
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    const response = await fetch("/api/admin/metrics", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not load metrics.");
    setMetrics(payload.metrics);
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

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setMetrics(null);
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
            <button
              onClick={logout}
              className="rounded-md bg-[#1f3447] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#162635]"
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="grid gap-8 py-8">
          <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">Overview</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">Site metrics</h2>
                <p className="mt-2 text-sm text-[#606978]">
                  Real numbers only. Page views are counted uniquely per visitor.
                </p>
              </div>
              <span className="text-sm font-medium text-[#606978]">Updated {latestUpdate}</span>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Page views"
                value={metrics?.pageViews ?? 0}
              />
              <MetricCard
                label="Users"
                value={metrics?.users ?? 0}
              />
              <MetricCard
                label="Papers uploaded"
                value={metrics?.papersUploaded ?? 0}
              />
            </div>
          </section>

          {message ? (
            <div className="rounded-md border border-[#d6d0c5] bg-white px-4 py-3 text-sm font-semibold text-[#2d3342] shadow-[0_12px_30px_rgba(29,33,42,0.05)]">
              {message}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
