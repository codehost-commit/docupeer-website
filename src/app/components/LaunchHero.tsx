import Image from "next/image";
import Link from "next/link";
import { PaperStack } from "./PaperStack";

export function LaunchHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-deep-border/70 bg-[linear-gradient(180deg,#efede7_0%,#f6f5f2_34%,#f6f5f2_100%)]">
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="text-left">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-deep-accent">
              Free peer review platform
            </p>
            <h1 className="poiret text-balance text-5xl leading-[1.05] text-deep-text sm:text-6xl">
              Free peer review for{" "}
              <span className="display text-deep-accent">research papers</span>.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-deep-text-soft sm:text-xl">
              DocuPeer is a free peer review platform where you review two
              papers to unlock one submission of your own. It helps students,
              researchers, and writers get anonymous, subject-aware feedback
              that improves clarity, rigor, and confidence before sharing work
              more broadly.
            </p>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href="/review" className="btn-primary px-7 py-3 text-base">
                Start reviewing
              </Link>
              <Link href="/register" className="btn-secondary px-7 py-3 text-base">
                Sign up
              </Link>
            </div>
          </div>

          <div className="relative">
            <PaperStack />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="mx-auto mt-24 flex max-w-4xl items-center gap-5"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-deep-border-strong" />
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-deep-panel2/70 ring-1 ring-black/5 shadow-[0_8px_20px_rgba(16,24,40,0.06)]">
            <Image
              src="/docupeer-logo.png"
              alt=""
              width={168}
              height={168}
              className="h-[96%] w-[96%] object-contain"
            />
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-deep-border-strong" />
        </div>
      </div>
    </section>
  );
}
