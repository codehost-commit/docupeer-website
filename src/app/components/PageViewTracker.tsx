"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function shouldTrack(pathname: string) {
  return !(
    pathname === "/admin" ||
    pathname === "/status-manage" ||
    pathname === "/live-manage"
  );
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldTrack(pathname)) return;
    const body = JSON.stringify({ pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/admin/page-view",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    fetch("/api/admin/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
