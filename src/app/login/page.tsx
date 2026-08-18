"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiPost("/api/auth/login", { email, password });
      window.location.href = next;
    } catch (err: any) {
      setError(err?.message || "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6"><h1 className="mt-1 text-2xl font-bold tracking-tight text-deep-text">
        Welcome back
      </h1>
      <p className="mt-1 text-sm text-deep-dim">
        Continue reviewing and submitting.
      </p>

      {next.includes("/review") && (
        <div className="mt-4 rounded-lg border border-deep-accent/40 bg-deep-accent/10 px-4 py-3 text-sm text-deep-accent">
          Sign in to submit your review. Your work is saved and will be
          restored right after.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-deep-bad/40 bg-deep-bad/10 px-4 py-3 text-sm text-deep-bad">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="card mt-5 space-y-4 p-6 sm:p-8">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? "Signing in." : "Sign in"}
        </button>
        <p className="text-center text-sm text-deep-dim">
          New to DocuPeer?{" "}
          <Link
            href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="link font-semibold"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
