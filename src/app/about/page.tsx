import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn what DocuPeer is, why it exists, and how Rahul Awasthi is building a free peer review platform for research papers, including its wholly owned subsidiaries Atom Edu and DocuClerk HQ.",
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

type Subsidiary = {
  name: string;
  href: string;
  logo: string;
  logoAlt: string;
  body: string;
  logoClassName?: string;
};

const FOUNDERS: Person[] = [
  {
    name: "Rahul Awasthi",
    role: "Co-Founder & CEO",
    image: "/team/rahul.jpeg",
    bio: "Building DocuPeer as a free, reciprocal peer review platform for serious writers.",
  },
  {
    name: "Aryan Patel",
    role: "Co-Founder & COO",
    image: "/team/founder-2.png",
    bio: "Leading operations so DocuPeer can serve writers with clarity, consistency, and care.",
  },
];

const SUBSIDIARIES: Subsidiary[] = [
  {
    name: "Atom Edu",
    href: "https://atom-edu.org",
    logo: "/partners/atom-edu-logo-tight.png",
    logoAlt: "Atom Edu logo",
    body: "Atom Edu is an edtech company committed to saving teachers time and making it easier to manage students, create assignments, and keep classroom work moving with less friction.",
    logoClassName: "mix-blend-multiply",
  },
  {
    name: "DocuClerk HQ",
    href: "https://docuclerkhq.com/about.html",
    logo: "/partners/docuclerk-subsidiary-logo.svg",
    logoAlt: "DocuClerk HQ logo",
    body: "DocuClerk HQ is a privacy-first AI contract analysis tool for everyday users and freelancers. It uses on-device artificial intelligence to flag, categorize, and highlight potential red flags and important notes in complex legal agreements without sending sensitive contract data to an external server.",
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

function SubsidiaryCard({ subsidiary }: { subsidiary: Subsidiary }) {
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex min-h-[220px] items-center justify-center bg-[#f0ede5] p-8 sm:p-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={subsidiary.logo}
          alt={subsidiary.logoAlt}
          loading="lazy"
          className={`max-h-40 w-full max-w-[13rem] object-contain ${subsidiary.logoClassName ?? ""}`}
        />
      </div>
      <div className="flex flex-1 flex-col p-8 sm:p-10">
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-deep-accent">
          100% owned by DocuPeer
        </p>
        <h2 className="poiret mt-3 text-4xl text-deep-text sm:text-5xl">
          {subsidiary.name}
        </h2>
        <p className="serif mt-5 flex-1 text-lg leading-relaxed text-deep-text-soft">
          {subsidiary.body}
        </p>
        <div className="mt-7">
          <Link
            href={subsidiary.href}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-6 py-3 text-base"
          >
            Visit {subsidiary.name}
          </Link>
        </div>
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
        subOrganization: [
          {
            "@type": "Organization",
            name: "Atom Edu",
            url: "https://atom-edu.org",
            description:
              "A wholly owned DocuPeer subsidiary building edtech tools that save teachers time and make student management easier.",
          },
          {
            "@type": "Organization",
            name: "DocuClerk HQ",
            url: "https://docuclerkhq.com/about.html",
            description:
              "A wholly owned DocuPeer subsidiary and privacy-first AI contract analysis tool that helps everyday users and freelancers understand complex contract clauses with on-device artificial intelligence.",
          },
        ],
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
          The founders behind the{" "}
          <span className="display text-deep-accent">review</span>.
        </h1>
        <p className="serif mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-deep-text-soft">
          DocuPeer exists because thoughtful feedback should not be gated by
          money, prestige, or the right connections. It is built by Rahul
          Awasthi and Aryan Patel, who believe writing improves when the people
          reviewing it are qualified, honest, and treated as equals.
        </p>
        <p className="serif mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-deep-dim">
          Rahul Awasthi serves as Co-Founder & CEO, and Aryan Patel serves as
          Co-Founder & COO.
        </p>
      </header>

      {/* Founders */}
      <section className="mt-20">
        <SectionHeader title="Meet the founders" />
        <div className="mx-auto grid max-w-3xl gap-12 sm:grid-cols-2">
          {FOUNDERS.map((p) => (
            <FounderCard key={p.name} person={p} />
          ))}
        </div>
      </section>

      {/* Subsidiary */}
      <section className="mt-24">
        <SectionHeader title="Our subsidiaries" />
        <div className="grid gap-6 lg:grid-cols-2">
          {SUBSIDIARIES.map((subsidiary) => (
            <SubsidiaryCard key={subsidiary.name} subsidiary={subsidiary} />
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
