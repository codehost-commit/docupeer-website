"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { Btn, Field, Input, Select, Spinner } from "../_lib/ui";
import { Icon } from "./icons";
import type { GpaScale } from "@/lib/atom/types";

const GRADE_OPTIONS = ["9", "10", "11", "12", "College", "Other"].map((g) => ({ value: g, label: g === "Other" ? "Other" : `Grade ${g}`.replace("Grade College", "College") }));

export function Onboarding({ initialName, onDone }: { initialName: string; onDone: () => void }) {
  const [name, setName] = useState(initialName.toUpperCase());
  const [gradeLevel, setGradeLevel] = useState("");
  const [gpaScale, setGpaScale] = useState<GpaScale>("4.0");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function onFile(file: File) {
    if (file.size > 500_000) {
      setError("Please choose an image under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.updateProfile({
        name: name.trim().toUpperCase(),
        gradeLevel: gradeLevel || null,
        gpaScale,
        avatarUrl: avatar,
        completeOnboarding: true,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-deep-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="font-display text-2xl text-deep-text">Welcome to Atom</div>
          <div className="mt-1 text-sm text-deep-dim">A couple of details and you&apos;re in. All optional except your name.</div>
        </div>
        <div className="space-y-4 rounded-2xl border border-deep-border bg-deep-panel p-6 shadow-panel">
          <div className="flex items-center gap-4">
            <label className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full border border-deep-border bg-deep-panel2">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-2xl text-deep-dim">
                  {name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Icon name="upload" size={20} />
              </span>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => e.target.files && e.target.files[0] && onFile(e.target.files[0])}
              />
            </label>
            <div className="flex-1">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="YOUR NAME" />
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade (optional)">
              <Select value={gradeLevel} onChange={setGradeLevel} options={[{ value: "", label: "Not set" }, ...GRADE_OPTIONS]} />
            </Field>
            <Field label="GPA scale">
              <Select
                value={gpaScale}
                onChange={(v) => setGpaScale(v as GpaScale)}
                options={[
                  { value: "4.0", label: "4.0 (unweighted)" },
                  { value: "5.0", label: "5.0 (weighted)" },
                  { value: "percent", label: "Percent only" },
                  { value: "none", label: "No GPA" },
                ]}
              />
            </Field>
          </div>
          {error && <div className="rounded-lg bg-deep-bad/10 px-3 py-2 text-xs text-deep-bad">{error}</div>}
          <Btn onClick={submit} disabled={busy} className="w-full">
            {busy ? <Spinner className="h-4 w-4" /> : "Start using Atom"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
