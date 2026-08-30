import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn what DocuPeer is, why it exists, and how Rahul Awasthi is building a free peer review platform for research papers, including its wholly owned subsidiary Atom Edu.",
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

const FOUNDER: Person[] = [
  {
    name: "Rahul Awasthi",
    role: "Founder & CEO",
    image: "/team/rahul.jpeg",
    bio: "Building and operating DocuPeer as a free, reciprocal peer review platform for serious writers.",
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

function FounderCard({ person }: { person: Person }) {
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
      "About Rahul Awasthi and the mission behind the free DocuPeer peer review platform.",
    mainEntity: [
      {
        "@type": "Person",
        name: "Rahul Awasthi",
        jobTitle: "Founder & CEO",
      },
      {
        "@type": "Organization",
        name: "DocuPeer",
        description: SITE_DESCRIPTION,
        founder: {
          "@type": "Person",
          name: "Rahul Awasthi",
          jobTitle: "Founder & CEO",
        },
        subOrganization: {
          "@type": "Organization",
          name: "Atom Edu",
          url: "https://atom-edu.org",
          description:
            "A wholly owned DocuPeer subsidiary building edtech tools that save teachers time and make student management easier.",
        },
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
          The founder behind the{" "}
          <span className="display text-deep-accent">review</span>.
        </h1>
        <p className="serif mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-deep-text-soft">
          DocuPeer exists because thoughtful feedback should not be gated by
          money, prestige, or the right connections. It is built by Rahul
          Awasthi, who believes writing improves when the people reviewing it
          are qualified, honest, and treated as equals.
        </p>
        <p className="serif mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-deep-dim">
          Rahul Awasthi is the sole Founder & CEO of DocuPeer, a free peer
          review platform for anonymous, reciprocal feedback.
        </p>
      </header>

      {/* Founder */}
      <section className="mt-20">
        <SectionHeader title="Founder" />
        <div className="mx-auto max-w-sm">
          {FOUNDER.map((p) => (
            <FounderCard key={p.name} person={p} />
          ))}
        </div>
      </section>

      {/* Subsidiary */}
      <section className="mt-24">
        <SectionHeader title="Our subsidiary" />
        <div className="card overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="flex flex-col justify-center border-b border-deep-border p-8 sm:p-10 lg:border-b-0 lg:border-r">
              <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-deep-accent">
                100% owned by DocuPeer
              </p>
              <h2 className="poiret mt-3 text-4xl text-deep-text sm:text-5xl">
                Atom Edu
              </h2>
              <p className="serif mt-5 text-lg leading-relaxed text-deep-text-soft">
                DocuPeer owns Atom Edu as a wholly owned subsidiary. Atom Edu is
                an edtech company committed to saving teachers time and making
                it easier to manage students, create assignments, and keep
                classroom work moving with less friction.
              </p>
              <div className="mt-7">
                <Link
                  href="https://atom-edu.org"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary px-6 py-3 text-base"
                >
                  Visit Atom Edu
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center bg-[#f0ede5] p-8 sm:p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/partners/atom-edu-logo-tight.png"
                alt="Atom Edu logo"
                loading="lazy"
                className="w-full max-w-sm object-contain"
              />
            </div>
          </div>
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
