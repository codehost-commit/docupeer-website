"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, computeGpa, computeGrade, type AtomState, type ClassGrade, type NotificationRow } from "./_lib/api";
import { buildItems, type CalItem } from "./_lib/items";
import { Auth } from "./_components/Auth";
import { Onboarding } from "./_components/Onboarding";
import { Shell, NAV } from "./_components/Shell";
import { Dashboard } from "./_components/Dashboard";
import { Academics } from "./_components/Academics";
import { CalendarView } from "./_components/Calendar";
import { EcDeadlines } from "./_components/EcDeadlines";
import { Tasks } from "./_components/Tasks";
import { NotificationsView } from "./_components/Notifications";
import { Settings } from "./_components/Settings";
import { LoadingState } from "../components/LoadingState";

export interface SectionProps {
  state: AtomState;
  grades: Map<string, ClassGrade>;
  items: CalItem[];
  gpa: number | null;
  refresh: () => Promise<void>;
  setView: (v: string) => void;
}

function readHash(): string {
  const h = (typeof window !== "undefined" ? window.location.hash : "").replace(/^#\/?/, "");
  const key = h.split("?")[0];
  return NAV.some((n) => n.key === key) ? key : "dashboard";
}

export default function AtomApp() {
  const [status, setStatus] = useState<"loading" | "signedout" | "ready" | "error">("loading");
  const [state, setState] = useState<AtomState | null>(null);
  const [view, setViewState] = useState("dashboard");
  const [focusClassId, setFocusClassId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const s = await api.state();
      setState(s);
      setStatus("ready");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401) setStatus("signedout");
      else {
        setLoadError(err instanceof Error ? err.message : "Failed to load");
        setStatus("error");
      }
    }
  }, []);

  const reloadNotifications = useCallback(async () => {
    try {
      const r = await api.notifications();
      setNotifications(r.notifications);
      setUnread(r.unreadCount);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/atom-sw.js").catch(() => {});
    load();
  }, [load]);

  useEffect(() => {
    if (status === "ready") reloadNotifications();
  }, [status, reloadNotifications]);

  // Hash routing.
  useEffect(() => {
    const onHash = () => setViewState(readHash());
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setView = useCallback((v: string) => {
    window.location.hash = `#/${v}`;
    setViewState(v);
  }, []);

  const grades = useMemo(() => {
    const m = new Map<string, ClassGrade>();
    if (state) for (const c of state.classes) m.set(c.id, computeGrade(c, state.assignments, state.snapshots));
    return m;
  }, [state]);
  const items = useMemo(() => (state ? buildItems(state) : []), [state]);
  const gpa = useMemo(() => (state ? computeGpa(state, grades) : null), [state, grades]);

  if (status === "loading") {
    return <LoadingState className="min-h-screen bg-deep-bg text-deep-dim" />;
  }
  if (status === "signedout") return <Auth onAuthed={load} />;
  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-deep-bg px-4 text-center">
        <div className="font-display text-xl text-deep-text">Couldn&apos;t load Atom</div>
        <div className="text-sm text-deep-dim">{loadError}</div>
        <button onClick={load} className="rounded-lg bg-deep-accent px-4 py-2 text-sm text-white">Try again</button>
      </div>
    );
  }
  if (!state) return null;
  if (!state.profile.onboarded) return <Onboarding initialName={state.profile.name} onDone={load} />;

  const shared: SectionProps = { state, grades, items, gpa, refresh: load, setView };

  return (
    <Shell
      profile={state.profile}
      active={view}
      onNavigate={setView}
      unread={unread}
      onLogout={async () => {
        await api.logout().catch(() => {});
        setState(null);
        setStatus("signedout");
      }}
    >
      {view === "dashboard" && (
        <Dashboard {...shared} openClass={(id) => { setFocusClassId(id); setView("academics"); }} />
      )}
      {view === "academics" && (
        <Academics {...shared} focusClassId={focusClassId} clearFocus={() => setFocusClassId(null)} />
      )}
      {view === "calendar" && <CalendarView {...shared} />}
      {view === "ec" && <EcDeadlines {...shared} />}
      {view === "tasks" && <Tasks {...shared} />}
      {view === "notifications" && (
        <NotificationsView notifications={notifications} unread={unread} reload={reloadNotifications} setView={setView} />
      )}
      {view === "settings" && <Settings {...shared} reloadNotifications={reloadNotifications} />}
    </Shell>
  );
}
