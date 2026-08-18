import type { Metadata } from "next";
import Link from "next/link";
import { PaperStack } from "./components/PaperStack";
import {
  HOME_TAGLINE,
  PUBLIC_STATS,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_TITLE,
  absoluteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "DocuPeer peer review platform homepage",
      },
    ],
  },
};

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
  const homepageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DocuPeer",
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    about: [
      "Peer review",
      "Research papers",
      "Academic writing",
      "Anonymous feedback",
    ],
    mainEntity: {
      "@type": "Organization",
      name: "DocuPeer",
      founder: {
        "@type": "Person",
        name: "Rahul Awasthi",
        jobTitle: "Co-Founder & CEO",
      },
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is DocuPeer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "DocuPeer is a free peer review platform for research papers and serious writing. Users review two papers to unlock one submission and receive anonymous, level-appropriate feedback in return.",
        },
      },
      {
        "@type": "Question",
        name: "What are the benefits of DocuPeer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "DocuPeer helps writers get free feedback, receive subject-matter matched reviews, stay anonymous, and improve papers through constructive comments and highlighted suggestions.",
        },
      },
      {
        "@type": "Question",
        name: "How big is DocuPeer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "DocuPeer serves 40,000 users and hosts 13,000 research papers on the platform.",
        },
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero — left copy, right interactive paper stack */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
            {/* Left: copy */}
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
                that improves clarity, rigor, and confidence before sharing
                work more broadly.
              </p>

              <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
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

            {/* Right: interactive paper stack */}
            <div className="relative">
              <PaperStack />
            </div>
          </div>

          {/* Stat strip */}
          <div className="mx-auto mt-24 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-deep-border bg-deep-border/60 sm:grid-cols-4">
            {[
              { k: PUBLIC_STATS.users, v: "users" },
              { k: PUBLIC_STATS.papers, v: "research papers" },
              { k: "2 : 1", v: "reviews per submission" },
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

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-8 sm:p-10">
            <h2 className="poiret text-4xl text-deep-text sm:text-5xl">
              What is{" "}
              <span className="display text-deep-accent">DocuPeer</span>?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-deep-text-soft">
              DocuPeer is an online peer review platform for research papers,
              essays, thesis chapters, lab reports, and other serious writing.
              Instead of paying for feedback, users earn it by reviewing other
              papers first. That keeps the platform free, active, and centered
              on useful written critique.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-deep-text-soft">
              Every paper is shown anonymously to reviewers. Every review is
              matched by subject area and level when possible. The result is a
              better way to get feedback before a class submission, research
              deadline, application, or publication step.
            </p>
          </div>

          <div className="card p-8 sm:p-10">
            <h2 className="poiret text-4xl text-deep-text sm:text-5xl">
              Why writers use it
            </h2>
            <ul className="mt-6 grid gap-4">
              {[
                "Free peer review with no subscriptions or paid tiers.",
                "Anonymous feedback that reduces bias and keeps the focus on the writing.",
                "Reviewer matching by specialty and education level for better quality feedback.",
                "Inline highlights, comments, and suggestions that make revision easier.",
              ].map((benefit) => (
                <li key={benefit} className="surface p-4 text-base leading-relaxed text-deep-text-soft">
                  {benefit}
                </li>
              ))}
            </ul>
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

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="card p-10 sm:p-14">
          <h2 className="poiret text-center text-4xl text-deep-text sm:text-5xl">
            Common questions about{" "}
            <span className="display text-deep-accent">DocuPeer</span>
          </h2>
          <div className="mt-10 grid gap-5">
            {[
              {
                q: "What is DocuPeer used for?",
                a: "DocuPeer is used for getting peer review on research papers and serious writing before you submit, publish, or revise. Writers receive comments, highlighted suggestions, and overall feedback from other users on the platform.",
              },
              {
                q: "What are the benefits of DocuPeer?",
                a: "The main benefits are free access, anonymous peer review, subject-aware matching, and a reciprocal model that keeps the community active. It helps writers improve structure, clarity, argumentation, and evidence before higher-stakes submission.",
              },
              {
                q: "Who is behind DocuPeer?",
                a: "DocuPeer is built by Rahul Awasthi, Co-Founder & CEO, Aryan Patel, Co-Founder & COO, Akshaj Reddy Sanikommu, Interim CTO, and Pritam Avuthu, Interim CMO. Together they are building a free peer review platform focused on thoughtful, high-quality feedback.",
              },
            ].map((item) => (
              <div key={item.q} className="surface p-6">
                <h3 className="text-xl font-semibold text-deep-text">{item.q}</h3>
                <p className="mt-2 text-base leading-relaxed text-deep-text-soft">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
