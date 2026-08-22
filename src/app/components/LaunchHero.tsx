"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURE_LAUNCH_LABEL, launchTimeParts, type LaunchSnapshot } from "@/lib/launch-shared";
import { LaunchCelebration } from "./LaunchCelebration";
import { PaperStack } from "./PaperStack";

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/15 bg-white/[0.07] px-2 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur sm:px-4 sm:py-5">
      <div className="mono text-3xl font-medium tabular-nums text-white sm:text-5xl">{String(value).padStart(2, "0")}</div>
      <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/50 sm:text-[10px]">{label}</div>
    </div>
  );
}

export function LaunchHero({
  initialLaunch,
}: {
  initialLaunch: LaunchSnapshot;
}) {
  const [launch, setLaunch] = useState(initialLaunch);
  const [now, setNow] = useState(() => Date.now());
  const [celebrating, setCelebrating] = useState(false);
  const wasLaunched = useRef(initialLaunch.isLaunched);
  const countdown = launchTimeParts(launch.targetAt, now);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/launch/public", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const next: LaunchSnapshot = payload.launch;
      if (!wasLaunched.current && next.isLaunched) setCelebrating(true);
      wasLaunched.current = next.isLaunched;
      setLaunch(next);
    } catch {
      // Keep the safely locked initial state if the live status check fails.
    }
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 250);
    const poll = window.setInterval(refresh, 1500);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
    };
  }, [refresh]);

  return (
    <>
      <LaunchCelebration active={celebrating} onComplete={() => setCelebrating(false)} />
      <section className="launch-hero relative isolate overflow-hidden bg-[#07111c] text-white">
        <div className="launch-aurora absolute inset-0 opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_22%,rgba(53,109,151,0.28),transparent_38%),linear-gradient(180deg,transparent_65%,rgba(0,0,0,0.3))]" />
        <div className="absolute left-1/2 top-0 h-px w-[80vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ffd166]/60 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/65">
              <span className={`h-2 w-2 rounded-full ${launch.isLaunched ? "bg-emerald-400 shadow-[0_0_16px_#34d399]" : "animate-pulse bg-[#ff5d5d] shadow-[0_0_16px_#ff5d5d]"}`} />
              {launch.isLaunched ? "DocuPeer is live" : "Feature launch · final countdown"}
            </div>
            <Link href="/live" className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ffd166] transition hover:text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Watch the launch stream
              <span className="transition group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:gap-16">
            <div>
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.42em] text-[#ffd166] sm:text-xs">
                {launch.isLaunched ? "Open to everyone · free forever" : "One platform · one community · one moment"}
              </p>
              <h1 className="poiret text-balance text-5xl leading-[0.98] text-white sm:text-7xl lg:text-[5.3rem]">
                {launch.isLaunched ? (
                  <>The wait is over. <span className="display text-[#ffd166]">DocuPeer is live.</span></>
                ) : (
                  <>Peer review is about to <span className="display text-[#ffd166]">change forever.</span></>
                )}
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/68 sm:text-xl">
                {launch.isLaunched
                  ? "Review two papers, unlock a submission, and receive thoughtful, anonymous feedback from people who understand your field."
                  : "We are opening DocuPeer to the world: thoughtful, anonymous, subject-aware feedback for serious writing, completely free."}
              </p>

              {launch.isLaunched ? (
                <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <Link href="/register" className="launch-cta inline-flex rounded-full bg-[#ffd166] px-7 py-3.5 text-sm font-bold text-[#08111c] transition hover:bg-white">Create your free account</Link>
                  <Link href="/review" className="inline-flex rounded-full border border-white/25 bg-white/[0.06] px-7 py-3.5 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/[0.12]">Start reviewing</Link>
                </div>
              ) : (
                <div className="mt-9 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-xs font-semibold text-white/65">
                  <svg className="h-4 w-4 text-[#ffd166]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  Signups unlock with the live launch signal
                </div>
              )}
            </div>

            <div className="relative">
              {launch.isLaunched ? (
                <div className="launch-paper rounded-3xl bg-[#f8f6f0] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.48)] sm:p-5"><PaperStack /></div>
              ) : (
                <div className="rounded-3xl border border-white/15 bg-white/[0.055] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-md sm:p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">T minus</span>
                    <span className="mono text-[10px] tracking-[0.1em] text-[#ffd166]">{FEATURE_LAUNCH_LABEL}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <CountdownUnit value={countdown.days} label="Days" />
                    <CountdownUnit value={countdown.hours} label="Hours" />
                    <CountdownUnit value={countdown.minutes} label="Minutes" />
                    <CountdownUnit value={countdown.seconds} label="Seconds" />
                  </div>
                  <div className="mt-6 h-px overflow-hidden bg-white/10"><div className="launch-scan h-full w-1/3 bg-gradient-to-r from-transparent via-[#ffd166] to-transparent" /></div>
                  <div className="mt-5 flex items-start gap-3 text-sm leading-6 text-white/55">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#ffd166] shadow-[0_0_10px_#ffd166]" />
                    {countdown.remaining > 0 ? "The launch sequence is armed. Stay on this page for the live reveal." : "The launch window is open. Standing by for the final signal from the live stream."}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              { k: "Free", v: "peer review", cls: "display text-3xl sm:text-4xl" },
              { k: "Anon", v: "review flow", cls: "poiret text-4xl" },
              { k: "2 : 1", v: "reviews per submission", cls: "poiret text-4xl" },
              { k: "$0", v: "cost, forever", cls: "display text-4xl sm:text-5xl" },
            ].map((stat) => (
              <div key={stat.v} className="bg-[#0a1623]/90 px-4 py-6 text-center">
                <div className={`${stat.cls} font-normal tracking-normal text-white`}>{stat.k}</div>
                <div className="mt-2 text-xs text-white/45">{stat.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
