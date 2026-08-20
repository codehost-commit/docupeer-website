"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

// Editorial multi-column footer, Space Grotesk throughout.
// Small uppercase blue column kickers, stacked link lists,
// bottom bar with domain on the left and a CTA link on the right.

type Col = { heading: string; links: { href: string; label: string }[] };

const COLUMNS: Col[] = [
  {
    heading: "Product",
    links: [
      { href: "/review", label: "Review a paper" },
      { href: "/submit", label: "Submit your paper" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/history", label: "History" },
      { href: "/tpt", label: "The People's Talk" },
      { href: "/live", label: "DocuPeer Live" },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "/about", label: "About" },
      { href: "/tpt", label: "Community voices" },
      { href: "/register", label: "Create account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    heading: "Principles",
    links: [
      { href: "/about", label: "How it works" },
      { href: "/about", label: "Why free" },
      { href: "/about", label: "Anonymity" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/legal#privacy", label: "Privacy" },
      { href: "/legal#terms", label: "Terms" },
      { href: "/legal#attributions", label: "Attributions" },
    ],
  },
];

export function Footer() {
  const pathname = usePathname();
  const year = 2026;
  const domain = "docupeer.org";
  const isStatusSurface =
    pathname === "/status" ||
    pathname === "/status-manage" ||
    pathname === "/live" ||
    pathname === "/live-manage" ||
    (typeof window !== "undefined" && window.location.hostname.startsWith("status."));
  const isTptSurface = pathname === "/tpt";

  if (isStatusSurface) return null;

  return (
    <footer className={`site-footer relative font-sans ${isTptSurface ? "mt-0 bg-[#f9f7f1]" : "mt-24"}`}>
      <div className="rule" />
      <div className={isTptSurface ? "bg-[#f9f7f1]" : "bg-deep-panel/70"}>
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Logo size={42} />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-deep-text-soft">
              A free peer-review community for papers. Review two, submit one,
              improve.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((c) => (
            <div key={c.heading}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-deep-accent">
                {c.heading}
              </h4>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={`${c.heading}-${l.label}`}>
                    <Link
                      href={l.href}
                      className="text-[15px] text-deep-text-soft transition hover:text-deep-accent"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-deep-border/70">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-deep-dim sm:flex-row sm:items-center sm:px-6">
            <div className="leading-relaxed">
              <div>&copy; {year} DocuPeer. All rights reserved.</div>
              <a
                href={`https://${domain}`}
                className="text-deep-text-soft hover:text-deep-accent"
              >
                {domain}
              </a>
            </div>
            <Link
              href="/live"
              className="group inline-flex items-center gap-1.5 text-deep-text-soft transition hover:text-deep-accent"
            >
              Watch DocuPeer Live
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="transition group-hover:translate-x-0.5"
                aria-hidden
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
