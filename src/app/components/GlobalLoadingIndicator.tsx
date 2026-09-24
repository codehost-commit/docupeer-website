"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "./LoadingSpinner";

export function GlobalLoadingIndicator() {
  const pathname = usePathname();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let active = 0;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      active += 1;
      setPendingRequests(active);
      try {
        return await originalFetch(...args);
      } finally {
        active = Math.max(0, active - 1);
        setPendingRequests(active);
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash === window.location.hash) return;

      setNavigating(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const visible = navigating || pendingRequests > 0;

  return (
    <div
      className={`pointer-events-none fixed right-4 top-4 z-[100] transition-all duration-200 ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-deep-border bg-deep-panel/95 text-deep-accent shadow-panel backdrop-blur">
        <LoadingSpinner className="h-5 w-5" />
      </div>
    </div>
  );
}
