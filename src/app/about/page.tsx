import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn what DocuPeer is and why it exists — a free peer review platform for anonymous, reciprocal feedback on research papers.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About DocuPeer",
    description: SITE_DESCRIPTION,
    url: "/about",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "About DocuPeer",
      },
    ],
  },
};

type Person = {
  name: string;
  role: string;
  bio?: string;
};

const LEADERSHIP: Person[] = [
  {
    name: "Pritam Avuthu",
    role: "Lead Developer",
    bio: "Leads engineering across the DocuPeer platform — from the review surface to the reciprocal-credit system that keeps feedback flowing.",
  },
  {
    name: "Akshaj",
    role: "Lead Product Designer",
    bio: "Shapes how DocuPeer looks and feels, from typography and layout to the details that make writing feedback easier to give and to receive.",
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function LeaderCard({ person }: { person: Person }) {
  return (
    <div className="card flex flex-col items-center gap-5 p-8 text-center animate-fadeUp">
      <div className="relative h-40 w-40 overflow-hidden rounded-full border border-deep-border bg-deep-panel2 shadow-panel">
        <div className="absolute inset-0 grid place-items-center">
          <span className="poiret text-5xl font-normal text-deep-dim">
            {initials(person.name)}
          </span>
        </div>
      </div>
      <div>
        <div className="poiret text-3xl font-normal tracking-wide text-deep-text">
          {person.name}
        </div>
        <div className="mt-1 text-sm uppercase tracking-[0.16em] text-deep-accent">
          {person.role}
        </div>
        {person.bio && (
          <p className="serif mx-auto mt-4 max-w-sm text-base leading-relaxed text-deep-text-soft">
            {person.bio}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-12 text-center">
      <h2 className="poiret text-4xl font-normal tracking-wide text-deep-text sm:text-5xl">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-16 bg-deep-border-strong" />
    </div>
  );
}

export default function AboutPage() {
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About DocuPeer",
    url: absoluteUrl("/about"),
    description:
      "About DocuPeer — a free peer review platform for anonymous, reciprocal feedback on research papers.",
    mainEntity: {
      "@type": "Organization",
      name: "DocuPeer",
      description: SITE_DESCRIPTION,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      {/* Intro */}
      <header className="text-center">
        <h1 className="poiret text-4xl text-deep-text sm:text-6xl">
          A free platform for real{" "}
          <span className="display text-deep-accent">review</span>.
        </h1>
        <p className="serif mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-deep-text-soft">
          DocuPeer exists because thoughtful feedback should not be gated by
          money, prestige, or the right connections. It is a reciprocal peer
          review platform where writers earn feedback by giving it.
        </p>
      </header>

      {/* Leadership */}
      <section className="mt-20">
        <SectionHeader title="Leadership" />
        <div className="grid gap-8 sm:grid-cols-2">
          {LEADERSHIP.map((p) => (
            <LeaderCard key={p.name} person={p} />
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="mt-24">
        <SectionHeader title="What we believe" />
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              t: "Free, always.",
              b: "No paid tiers, no subscriptions. Reciprocity is the only currency.",
            },
            {
              t: "Anonymous by default.",
              b: "Authors and reviewers never see each other. Feedback stands on its own.",
            },
            {
              t: "Qualified peers.",
              b: "Papers are matched to reviewers who understand the subject and level.",
            },
          ].map((c) => (
            <div key={c.t} className="card p-6 text-center">
              <h3 className="poiret text-2xl font-normal tracking-wide text-deep-text">
                {c.t}
              </h3>
              <p className="serif mt-2 text-base leading-relaxed text-deep-text-soft">
                {c.b}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20">
        <div className="card p-10 text-center">
          <h2 className="poiret text-3xl text-deep-text sm:text-4xl">
            Want to help{" "}
            <span className="display text-deep-accent">build it</span>?
          </h2>
          <p className="serif mx-auto mt-3 max-w-2xl text-lg text-deep-text-soft">
            The best way to support DocuPeer is to use it. Review a paper,
            submit your writing, and tell one friend who would care about
            better feedback.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/review" className="btn-primary px-6 py-3 text-base">
              Start reviewing
            </Link>
            <Link href="/register" className="btn-secondary px-6 py-3 text-base">
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
