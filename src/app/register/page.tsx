"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/client";
import {
  EDUCATION_LEVELS,
  EXPERTISE_CATEGORIES,
  educationNeedsGrade,
} from "@/lib/constants";

function RegisterForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    expertiseCategory: "",
    specialty: "",
    educationLevel: "",
    gradeYear: "",
    strength: 50,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const needsGrade = educationNeedsGrade(form.educationLevel);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setServerError("");
    setErrors({});
    try {
      await apiPost("/api/auth/register", form);
      window.location.href = next;
    } catch (err: any) {
      if (err?.data?.errors) setErrors(err.data.errors);
      else setServerError(err?.message || "Could not create your account.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6"><h1 className="mt-1 text-2xl font-bold tracking-tight text-deep-text">
          Create your DocuPeer account
        </h1>
        <p className="mt-1 text-sm text-deep-dim">
          Your profile helps us match you with papers you are qualified to
          review. It is never shown to the authors you review.
        </p>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg border border-deep-bad/40 bg-deep-bad/10 px-4 py-3 text-sm text-deep-bad">
          {serverError}
        </div>
      )}

      <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ada Lovelace"
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="At least 8 characters"
          />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Expertise category</label>
            <select
              className="input"
              value={form.expertiseCategory}
              onChange={(e) => set("expertiseCategory", e.target.value)}
            >
              <option value="">Select a category.</option>
              {EXPERTISE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.expertiseCategory && (
              <p className="field-error">{errors.expertiseCategory}</p>
            )}
          </div>
          <div>
            <label className="label">Specialty</label>
            <input
              className="input"
              value={form.specialty}
              onChange={(e) => set("specialty", e.target.value)}
              placeholder="e.g. Molecular biology, Poetry, Macroeconomics"
            />
            {errors.specialty && (
              <p className="field-error">{errors.specialty}</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Education / professional status</label>
            <select
              className="input"
              value={form.educationLevel}
              onChange={(e) => set("educationLevel", e.target.value)}
            >
              <option value="">Select.</option>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {errors.educationLevel && (
              <p className="field-error">{errors.educationLevel}</p>
            )}
          </div>
          {needsGrade && (
            <div>
              <label className="label">Grade / year</label>
              <input
                className="input"
                value={form.gradeYear}
                onChange={(e) => set("gradeYear", e.target.value)}
                placeholder="e.g. 11th grade, Sophomore"
              />
              {errors.gradeYear && (
                <p className="field-error">{errors.gradeYear}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="label">
            Strength in your specialty. <span className="mono text-deep-accent">{form.strength}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={form.strength}
            onChange={(e) => set("strength", Number(e.target.value))}
            className="w-full accent-deep-accent"
          />
          <div className="mono mt-1 flex justify-between text-[10px] uppercase tracking-[0.14em] text-deep-dim">
            <span>Still learning</span>
            <span>Confident</span>
            <span>Expert</span>
          </div>
          {errors.strength && <p className="field-error">{errors.strength}</p>}
        </div>

        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? "Creating account." : "Create account"}
        </button>
        <p className="text-center text-sm text-deep-dim">
          Already have an account?{" "}
          <Link
            href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="link font-semibold"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
