"use client";

import { ReactNode, useState } from "react";
import { cx } from "../_lib/ui";
import { Icon, type IconName } from "./icons";
import type { AtomProfile } from "../_lib/api";

// Navigation is a plain array so future ATOMEdu features slot in without a redesign.
export const NAV: { key: string; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "academics", label: "Academics", icon: "academics" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "ec", label: "EC Deadlines", icon: "ec" },
  { key: "tasks", label: "Tasks", icon: "tasks" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export function Shell({
  profile,
  active,
  onNavigate,
  unread,
  onLogout,
  children,
}: {
  profile: AtomProfile;
  active: string;
  onNavigate: (key: string) => void;
  unread: number;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeLabel = NAV.find((n) => n.key === active)?.label ?? "Atom";

  const navList = (
    <nav className="space-y-1">
      {NAV.map((n) => (
        <button
          key={n.key}
          onClick={() => {
            onNavigate(n.key);
            setMobileOpen(false);
          }}
          className={cx(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            active === n.key ? "bg-deep-accent-soft text-deep-accent" : "text-deep-text-soft hover:bg-deep-panel2",
          )}
        >
          <Icon name={n.icon} size={18} />
          <span className="flex-1 text-left">{n.label}</span>
          {n.key === "notifications" && unread > 0 && (
            <span className="rounded-full bg-deep-bad px-1.5 py-0.5 text-[10px] font-semibold text-white">{unread}</span>
          )}
        </button>
      ))}
    </nav>
  );

  const avatar = (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-deep-border bg-deep-panel2 font-display text-deep-dim">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          profile.name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-deep-text">{profile.name}</div>
        <div className="truncate text-xs text-deep-dim">{profile.gradeLevel ? `Grade ${profile.gradeLevel}`.replace("Grade College", "College") : profile.email}</div>
      </div>
      <button onClick={onLogout} className="rounded-lg p-1.5 text-deep-dim hover:bg-deep-panel2" title="Sign out">
        <Icon name="logout" size={16} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-deep-bg text-deep-text">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-deep-border bg-deep-panel px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="font-display text-2xl text-deep-text">Atom</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-deep-dim">by DocuPeer</span>
        </div>
        <div className="flex-1">{navList}</div>
        <div className="border-t border-deep-border pt-3">{avatar}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-deep-border bg-deep-panel/90 px-4 py-3 backdrop-blur md:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-deep-text-soft hover:bg-deep-panel2">
          <Icon name="menu" />
        </button>
        <span className="font-display text-lg">{activeLabel}</span>
        <button onClick={() => onNavigate("notifications")} className="relative rounded-lg p-1.5 text-deep-text-soft hover:bg-deep-panel2">
          <Icon name="bell" size={18} />
          {unread > 0 && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-deep-bad" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-deep-text/25 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-deep-border bg-deep-panel px-3 py-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="font-display text-2xl">Atom</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-deep-dim">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="flex-1">{navList}</div>
            <div className="border-t border-deep-border pt-3">{avatar}</div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="mb-5 hidden font-display text-2xl text-deep-text md:block">{activeLabel}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
