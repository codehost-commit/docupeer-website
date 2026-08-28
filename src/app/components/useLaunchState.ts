"use client";

import { useEffect, useState } from "react";

export function useLaunchState() {
  const [isLaunched, setIsLaunched] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/launch/public", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setIsLaunched(payload?.launch?.isLaunched === true);
      } catch {
        // Navigation remains safely locked when status cannot be verified.
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return isLaunched;
}
