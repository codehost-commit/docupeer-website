"use client";

import { useEffect } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export function LoadingState({ label = "Loading", className = "" }: { label?: string; className?: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className={`flex min-h-[40vh] flex-col items-center justify-center text-current ${className}`} role="status" aria-label={label}>
      <LoadingSpinner className="h-8 w-8 text-deep-accent" />
      <div className="mono mt-3 text-xs uppercase tracking-widest text-current">
        {label}<span className="loading-dots" aria-hidden="true" />
      </div>
    </div>
  );
}
