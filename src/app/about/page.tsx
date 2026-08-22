import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn what DocuPeer is, why it exists, and how the DocuPeer team is building a free peer review platform for research papers.",
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
  image: string;
  bio?: string;
};

const TEAM: Person[] = [
  {
    name: "Aryan Patel",
    role: "Co-Founder & COO",
    image: "/team/aryan.jpeg",
    bio: "Operations, community, and the day-to-day work of making DocuPeer trustworthy and useful.",
  },
  {
    name: "Pritam Avuthu",
    role: "CEO",
    image: "/team/pritam.jpeg",
    bio: "Growth, access, and the leadership needed to keep DocuPeer free and useful across disciplines.",
  },
  {
    name: "Akshaj Sanikommu",
    role: "CTO",
    image: "/team/akshaj.jpeg",
    bio: "Technology, reliability, and the product systems that make reciprocal review work at scale.",
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function Headshot({
  person,
}: {
  person: Person;
}) {
  const dim = "h-52 w-52 sm:h-56 sm:w-56";
  return (
    <div
      className={`relative ${dim} overflow-hidden rounded-full border border-deep-border bg-deep-panel2 shadow-panel`}
    >
      {/* Initials sit behind the image so a missing file still looks intentional. */}
      <div className="absolute inset-0 grid place-items-center">
        <span className="poiret text-5xl font-normal text-deep-dim">
          {initials(person.name)}
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={person.image}
        alt={person.name}
        loading="lazy"
        className="relative h-full w-full object-cover"
      />
    </div>
  );
}

function TeamCard({ person }: { person: Person }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center animate-fadeUp">
      <Headshot person={person} />
      <div>
        <div className="poiret text-3xl font-normal tracking-wide text-deep-text sm:text-4xl">
          {person.name}
        </div>
        <div className="mt-1 text-sm uppercase tracking-[0.16em] text-deep-accent">
          {person.role}
        </div>
        {person.bio && (
          <p className="serif mx-auto mt-4 max-w-sm text-lg leading-relaxed text-deep-text-soft">
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
      "About the DocuPeer team and the mission behind the free peer review platform.",
    mainEntity: [
      {
        "@type": "Person",
        name: "Aryan Patel",
        jobTitle: "Co-Founder & COO",
      },
      {
        "@type": "Person",
        name: "Akshaj Sanikommu",
        jobTitle: "CTO",
      },
      {
        "@type": "Organization",
        name: "DocuPeer",
        description: SITE_DESCRIPTION,
      },
    ],
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
          The team behind the{" "}
          <span className="display text-deep-accent">review</span>.
        </h1>
        <p className="serif mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-deep-text-soft">
          DocuPeer exists because thoughtful feedback should not be gated by
          money, prestige, or the right connections. It is built by a small
          team that believes writing improves when the people
          reviewing it are qualified, honest, and treated as equals.
        </p>
        <p className="serif mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-deep-dim">
          Aryan Patel, Pritam Avuthu, and Akshaj Sanikommu are building
          DocuPeer as a free peer review platform for anonymous, reciprocal
          feedback.
        </p>
      </header>

      {/* Team */}
      <section className="mt-20">
        <SectionHeader title="Our team" />
        <div className="grid gap-14 sm:grid-cols-3 sm:gap-8">
          {TEAM.map((p) => (
            <TeamCard key={p.name} person={p} />
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
