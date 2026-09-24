"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Spinner } from "../_lib/ui";

export function Auth({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await api.register({ name, email, password });
      else await api.login({ email, password });
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-deep-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-display text-3xl text-deep-text">Atom</div>
          <div className="mt-1 text-sm text-deep-dim">Your school, in one place.</div>
        </div>
        <div className="rounded-2xl border border-deep-border bg-deep-panel p-6 shadow-panel">
          <div className="mb-4 flex rounded-xl border border-deep-border bg-deep-panel2 p-1 text-sm">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${
                  mode === m ? "bg-deep-panel text-deep-accent shadow-sm" : "text-deep-dim"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="YOUR NAME" required />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
            </Field>
            <Field label="Password" hint={mode === "register" ? "At least 8 characters." : undefined}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </Field>
            {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
            <Btn type="submit" disabled={busy} className="w-full">
              {busy ? <Spinner className="h-4 w-4" /> : mode === "login" ? "Sign in" : "Create account"}
            </Btn>
          </form>
          <p className="mt-4 text-center text-xs text-deep-dim">
            Your DocuPeer account works here too.
          </p>
        </div>
      </div>
    </div>
  );
}
