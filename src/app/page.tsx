import Link from "next/link";
import Image from "next/image";

function Step({
  n,
  title,
  highlight,
  body,
}: {
  n: number;
  title: string;
  highlight: string;
  body: string;
}) {
  return (
    <div className="card p-7">
      <div className="poiret text-3xl font-normal tracking-wide text-deep-accent">
        {n.toString().padStart(2, "0")}
      </div>
      <h3 className="poiret mt-2 text-2xl text-deep-text">
        {title}{" "}
        <span className="display text-deep-accent">{highlight}</span>
      </h3>
      <p className="mt-2 text-base leading-relaxed text-deep-text-soft">
        {body}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="flex flex-col items-center gap-7 sm:flex-row sm:gap-8">
              <Image
                src="/logo.png"
                alt="DocuPeer"
                width={288}
                height={288}
                priority
                className="h-24 w-24 rounded-[22%] shadow-glow ring-1 ring-black/5 sm:h-28 sm:w-28"
              />
              <span className="poiret text-6xl font-normal tracking-wide text-deep-text sm:text-8xl">
                DocuPeer
              </span>
            </div>

            <h1 className="poiret mt-14 text-balance text-4xl leading-tight text-deep-text sm:text-6xl">
              Peer review that{" "}
              <span className="display text-deep-accent">gives back</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-deep-text-soft sm:text-xl">
              Review two papers, unlock one submission of your own. DocuPeer
              connects your writing with people who understand the subject and
              are at the right level to help. Anonymously, thoughtfully, and
              for free.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/review" className="btn-primary px-7 py-3 text-base">
                Start reviewing
              </Link>
              <Link
                href="/register"
                className="btn-secondary px-7 py-3 text-base"
              >
                Create an account
              </Link>
            </div>
          </div>

          {/* Stat strip */}
          <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-deep-border bg-deep-border/60 sm:grid-cols-4">
            {[
              { k: "2 : 1", v: "reviews per submission" },
              { k: "350+", v: "word minimum" },
              { k: "24 h", v: "between submissions" },
              { k: "0", v: "cost, forever" },
            ].map((s) => (
              <div key={s.v} className="bg-deep-panel px-4 py-7 text-center">
                <div className="poiret text-4xl font-normal tracking-wide text-deep-text">
                  {s.k}
                </div>
                <div className="mt-2 text-sm text-deep-dim">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rule mx-auto max-w-6xl" />

      {/* Loop */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="poiret mb-14 text-center text-4xl text-deep-text sm:text-5xl">
          Review, unlock,{" "}
          <span className="display text-deep-accent">submit, learn</span>.
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Step n={1} title="Review 2" highlight="papers" body="Read anonymous papers matched to your expertise and level. Highlight, suggest, and explain." />
          <Step n={2} title="Unlock a" highlight="submission" body="Every 2 completed reviews earns you 1 submission credit. Fair by design." />
          <Step n={3} title="Submit your" highlight="paper" body="Post a paper of 350 or more words. One submission per day keeps quality high." />
          <Step n={4} title="Receive real" highlight="feedback" body="Constructive, subject-matter feedback from qualified peers. No numeric grades." />
        </div>
      </section>

      <div className="rule mx-auto max-w-6xl" />

      {/* Principles */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="card grid gap-10 p-10 sm:grid-cols-2 sm:p-14">
          <div>
            <h2 className="poiret text-4xl text-deep-text sm:text-5xl">
              Built to{" "}
              <span className="display text-deep-accent">help</span>, not to
              hook.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-deep-text-soft">
              DocuPeer is not a social network and never will be. No paid
              tiers, no leaderboards, no reviewers competing against each
              other. Just people helping people write better, and earning the
              same in return.
            </p>
          </div>
          <ul className="grid gap-5">
            {[
              "Papers are fully anonymous to reviewers.",
              "Feedback comes from people at an appropriate level and specialty.",
              "You review to earn reviews. A balanced, reciprocal community.",
              "Your identity and email are never shown to reviewers.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <svg
                  className="mt-1.5 h-5 w-5 flex-none text-deep-accent"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-lg leading-snug text-deep-text">
                  {t}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
