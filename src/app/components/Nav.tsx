"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { apiPost, useMe } from "@/lib/client";

export function Nav() {
  const { me, loading, refresh } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isStatusSurface =
    pathname === "/status" ||
    pathname === "/status-manage" ||
    (typeof window !== "undefined" && window.location.hostname.startsWith("status."));

  if (isStatusSurface) return null;

  async function logout() {
    await apiPost("/api/auth/logout", {});
    await refresh();
    router.push("/");
  }

  const links = me
    ? [
        { href: "/review", label: "Review" },
        { href: "/submit", label: "Submit" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/history", label: "History" },
        { href: "/live", label: "DocuPeer Live" },
        { href: "/about", label: "About" },
      ]
    : [
        { href: "/review", label: "Start reviewing" },
        { href: "/live", label: "DocuPeer Live" },
        { href: "/about", label: "About" },
      ];

  return (
    <header className="site-nav sticky top-0 z-40 border-b border-deep-border/70 bg-deep-panel/80 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo size={50} />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium tracking-tight transition ${
                    active
                      ? "text-deep-accent"
                      : "text-deep-dim hover:text-deep-text"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {loading ? null : me ? (
            <>
              <span className="hidden text-xs uppercase tracking-widest text-deep-dim sm:inline">
                {me.name.split(" ")[0]}
              </span>
              <button onClick={logout} className="btn-ghost">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
          <button
            className="btn-ghost md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-deep-border/70 bg-deep-panel px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-deep-dim hover:text-deep-text hover:bg-black/5"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
