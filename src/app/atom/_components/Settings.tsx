"use client";

import { useState } from "react";
import { api, type AtomSettingsShape } from "../_lib/api";
import { enablePush } from "../_lib/push";
import { Badge, Btn, Card, ConfirmNameModal, Field, Input, Select, Spinner, Toggle, cx } from "../_lib/ui";
import { Icon } from "./icons";
import type { SectionProps } from "../AtomApp";
import type { GpaScale } from "@/lib/atom/types";

const PRESETS = [
  { m: 10080, l: "7 days" },
  { m: 4320, l: "3 days" },
  { m: 1440, l: "1 day" },
  { m: 60, l: "1 hour" },
];
const SCOPES: { k: string; l: string }[] = [
  { k: "assignment", l: "Assignments" },
  { k: "test", l: "Tests & quizzes" },
  { k: "project", l: "Projects" },
  { k: "ec", l: "EC deadlines" },
  { k: "task", l: "Tasks" },
];

export function Settings({ state, refresh, reloadNotifications }: SectionProps & { reloadNotifications: () => Promise<void> }) {
  const [name, setName] = useState(state.profile.name.toUpperCase());
  const [gradeLevel, setGradeLevel] = useState(state.profile.gradeLevel ?? "");
  const [gpaScale, setGpaScale] = useState<GpaScale>(state.profile.gpaScale);
  const [avatar, setAvatar] = useState<string | null>(state.profile.avatarUrl);
  const [settings, setSettings] = useState<AtomSettingsShape>(state.settings);
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState<"export" | "reset" | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.updateProfile({ name: name.trim().toUpperCase(), gradeLevel: gradeLevel || null, gpaScale, avatarUrl: avatar });
      await refresh();
      flash("Profile saved.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function togglePush(on: boolean) {
    if (on) {
      const res = await enablePush();
      if (!res.ok) {
        flash(res.reason || "Couldn't enable push.");
        return;
      }
    }
    setSettings((s) => ({ ...s, pushEnabled: on }));
    await api.settingsPatch({ pushEnabled: on });
    flash(on ? "Push notifications on." : "Push notifications off.");
  }

  async function toggleEmail(on: boolean) {
    setSettings((s) => ({ ...s, emailEnabled: on }));
    await api.settingsPatch({ emailEnabled: on });
  }

  function toggleReminder(scope: string, minutes: number) {
    setSettings((s) => {
      const cur = s.reminderDefaults[scope] || [];
      const next = cur.includes(minutes) ? cur.filter((m) => m !== minutes) : [...cur, minutes].sort((a, b) => b - a);
      return { ...s, reminderDefaults: { ...s.reminderDefaults, [scope]: next } };
    });
  }

  async function saveNotifications() {
    setSavingNotif(true);
    try {
      await api.settingsPatch({
        reminderDefaults: settings.reminderDefaults,
        categoryMutes: settings.categoryMutes,
        quietHours: settings.quietHours,
        timezone: settings.timezone,
      });
      flash("Notification settings saved.");
    } finally {
      setSavingNotif(false);
    }
  }

  async function test() {
    try {
      const r = await api.pushTest();
      if (r.push.sent > 0) flash("Test notification sent to this device.");
      else if (!r.pushConfigured) flash("Push isn't configured on the server yet.");
      else flash("No push device is subscribed — turn on push first.");
    } catch {
      flash("Couldn't send a test.");
    }
    reloadNotifications();
  }

  function doExport() {
    const a = document.createElement("a");
    a.href = "/api/atom/export";
    a.click();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-deep-text px-4 py-2 text-sm text-white shadow-glow">{toast}</div>
      )}

      {/* Profile */}
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg text-deep-text">Profile</h2>
        <div className="flex items-center gap-4">
          <label className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full border border-deep-border bg-deep-panel2">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-2xl text-deep-dim">{name.charAt(0).toUpperCase()}</span>
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Icon name="upload" size={20} />
            </span>
            <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 500_000) { flash("Image must be under 500KB."); return; }
              const r = new FileReader();
              r.onload = () => setAvatar(String(r.result));
              r.readAsDataURL(f);
            }} />
          </label>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} /></Field>
            <Field label="Grade">
              <Select value={gradeLevel} onChange={setGradeLevel} options={[{ value: "", label: "Not set" }, ...["9", "10", "11", "12", "College", "Other"].map((g) => ({ value: g, label: g }))]} />
            </Field>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="GPA scale">
            <Select value={gpaScale} onChange={(v) => setGpaScale(v as GpaScale)} options={[
              { value: "4.0", label: "4.0 (unweighted)" }, { value: "5.0", label: "5.0 (weighted)" }, { value: "percent", label: "Percent only" }, { value: "none", label: "No GPA" },
            ]} />
          </Field>
          <Field label="Email"><Input value={state.profile.email} disabled /></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Btn onClick={saveProfile} disabled={savingProfile}>{savingProfile ? <Spinner className="h-4 w-4" /> : "Save profile"}</Btn>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <h2 className="mb-1 font-display text-lg text-deep-text">Notifications</h2>
        <p className="mb-4 text-sm text-deep-dim">Get reminded before things are due — in your browser and, optionally, by email.</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-deep-border p-3">
            <div>
              <div className="text-sm font-medium text-deep-text">Browser / device push</div>
              <div className="text-xs text-deep-dim">Desktop and mobile notifications, even when Atom isn&apos;t open.</div>
            </div>
            <Toggle checked={settings.pushEnabled} onChange={togglePush} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-deep-border p-3">
            <div>
              <div className="text-sm font-medium text-deep-text">Email reminders</div>
              <div className="text-xs text-deep-dim">Sent to {state.profile.email}.</div>
            </div>
            <Toggle checked={settings.emailEnabled} onChange={toggleEmail} />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-deep-dim">When to remind me</div>
          <div className="space-y-2">
            {SCOPES.map((sc) => {
              const muted = settings.categoryMutes[sc.k];
              const sel = settings.reminderDefaults[sc.k] || [];
              return (
                <div key={sc.k} className="rounded-xl border border-deep-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-deep-text">{sc.l}</span>
                    <button onClick={() => setSettings((s) => ({ ...s, categoryMutes: { ...s.categoryMutes, [sc.k]: !muted } }))} className="text-xs text-deep-dim hover:text-deep-text">
                      {muted ? "Muted" : "On"}
                    </button>
                  </div>
                  <div className={cx("flex flex-wrap gap-2", muted && "pointer-events-none opacity-40")}>
                    {PRESETS.map((p) => (
                      <button
                        key={p.m}
                        onClick={() => toggleReminder(sc.k, p.m)}
                        className={cx("rounded-full border px-3 py-1 text-xs", sel.includes(p.m) ? "border-deep-accent bg-deep-accent-soft text-deep-accent" : "border-deep-border text-deep-dim hover:bg-deep-panel2")}
                      >
                        {p.l} before
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Btn variant="outline" size="sm" onClick={test}><Icon name="bell" size={14} /> Send test notification</Btn>
          <Btn onClick={saveNotifications} disabled={savingNotif}>{savingNotif ? <Spinner className="h-4 w-4" /> : "Save notification settings"}</Btn>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-deep-bad/40 p-5">
        <h2 className="mb-1 font-display text-lg text-deep-bad">Danger zone</h2>
        <p className="mb-4 text-sm text-deep-dim">Your data is yours. Download everything we store about you, or wipe it entirely.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-deep-border p-3">
            <div>
              <div className="text-sm font-medium text-deep-text">Export my data</div>
              <div className="text-xs text-deep-dim">Download a JSON file of everything Atom has stored about you.</div>
            </div>
            <Btn variant="outline" size="sm" onClick={() => setConfirm("export")}><Icon name="download" size={14} /> Export</Btn>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-deep-bad/40 bg-deep-bad/5 p-3">
            <div>
              <div className="text-sm font-medium text-deep-bad">Reset all data</div>
              <div className="text-xs text-deep-dim">Permanently deletes your classes, assignments, deadlines, tasks, and settings.</div>
            </div>
            <Btn variant="danger" size="sm" onClick={() => setConfirm("reset")}><Icon name="trash" size={14} /> Reset</Btn>
          </div>
        </div>
      </Card>

      {confirm === "export" && (
        <ConfirmNameModal
          name={state.profile.name}
          action="Export my data"
          description="This downloads a JSON copy of all your Atom data."
          onClose={() => setConfirm(null)}
          onConfirm={() => { doExport(); setConfirm(null); }}
        />
      )}
      {confirm === "reset" && (
        <ConfirmNameModal
          name={state.profile.name}
          action="Reset all data"
          description="Everything in Atom will be permanently deleted. This cannot be undone."
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await api.reset(state.profile.name); setConfirm(null); await refresh(); }}
        />
      )}
    </div>
  );
}
