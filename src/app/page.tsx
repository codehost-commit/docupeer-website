import type { Metadata } from "next";
import Image from "next/image";
import { LaunchHero } from "./components/LaunchHero";
import { getLaunchSnapshot } from "@/lib/launch";
import {
  HOME_TAGLINE,
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
    <div className="relative pl-14 sm:pl-0 sm:pt-28 sm:text-center">
      <div className="absolute left-0 top-1 grid h-9 w-9 place-items-center rounded-full border border-deep-accent/45 bg-deep-panel font-mono text-[11px] font-semibold text-deep-accent shadow-[0_0_0_8px_rgba(248,246,240,0.92)] sm:left-1/2 sm:top-14 sm:-translate-x-1/2">
        {n.toString().padStart(2, "0")}
      </div>
      <h3 className="poiret text-2xl text-deep-text">
        {title}{" "}
        <span className="display text-deep-accent">{highlight}</span>
      </h3>
      <p className="mt-3 max-w-[15rem] text-base leading-relaxed text-deep-text-soft sm:mx-auto">
        {body}
      </p>
    </div>
  );
}

function LeadershipCard({
  title,
  name,
  role,
  imageSrc,
  imageAlt,
  imageSide,
  body,
  imageClassName = "",
  imagePaneClassName = "",
}: {
  title: string;
  name: string;
  role: string;
  imageSrc: string;
  imageAlt: string;
  imageSide: "left" | "right";
  body: string;
  imageClassName?: string;
  imagePaneClassName?: string;
}) {
  const imageBlock = (
    <div
      className={`relative flex min-h-[260px] items-end overflow-hidden pt-8 sm:min-h-[320px] ${imagePaneClassName}`}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={540}
        height={700}
        className={`relative z-10 h-auto w-auto object-contain object-bottom ${imageClassName}`}
      />
    </div>
  );

  const textBlock = (
    <div className="flex h-full flex-col justify-center px-8 py-8 sm:px-10 sm:py-10">
      <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-deep-accent">
        Leadership Note
      </p>
      <h3 className="poiret mt-3 text-3xl text-deep-text sm:text-4xl">
        {title}
      </h3>
      <div className="mt-3 text-sm uppercase tracking-[0.16em] text-deep-accent">
        {name} . {role}
      </div>
      <p className="serif mt-5 text-lg leading-relaxed text-deep-text-soft">
        {body}
      </p>
    </div>
  );

  return (
    <div className="card overflow-hidden lg:grid lg:items-end">
      {imageSide === "left" ? (
        <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-end">
          <div className="border-b border-deep-border lg:border-b-0 lg:border-r">
            {imageBlock}
          </div>
          {textBlock}
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          {textBlock}
          <div className="border-t border-deep-border lg:border-l lg:border-t-0">
            {imageBlock}
          </div>
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const launch = await getLaunchSnapshot();
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
      founder: [
        {
          "@type": "Person",
          name: "Aryan Patel",
          jobTitle: "Co-Founder & COO",
        },
      ],
      employee: {
        "@type": "Person",
        name: "Akshaj Sanikommu",
        jobTitle: "CTO",
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
      <LaunchHero initialLaunch={launch} />

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
        <div className="relative mx-auto max-w-5xl">
          <div className="absolute left-[17px] top-5 h-[calc(100%-2.5rem)] w-px bg-deep-border sm:hidden" />
          <div className="absolute left-0 right-0 top-[4.65rem] hidden h-px bg-deep-border sm:block" />
          <div className="grid gap-12 sm:grid-cols-4 sm:gap-8">
            <Step n={1} title="Review 2" highlight="papers" body="Read anonymous papers matched to your expertise and level. Highlight, suggest, and explain." />
            <Step n={2} title="Unlock a" highlight="submission" body="Every 2 completed reviews earns you 1 submission credit. Fair by design." />
            <Step n={3} title="Submit your" highlight="paper" body="Post a paper of 350 or more words. One submission per day keeps quality high." />
            <Step n={4} title="Receive real" highlight="feedback" body="Constructive, subject-matter feedback from qualified peers. No numeric grades." />
          </div>
        </div>
      </section>

      <div className="rule mx-auto max-w-6xl" />

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="poiret text-4xl text-deep-text sm:text-5xl">
            A few words from the{" "}
            <span className="display text-deep-accent">team</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-deep-text-soft">
            The people building DocuPeer care deeply about useful feedback,
            open access, and keeping the platform grounded in real academic
            and professional needs.
          </p>
        </div>

        <div className="space-y-8">
          <LeadershipCard
            title="A Word From Our CEO"
            name="Pritam Avuthu"
            role="CEO"
            imageSrc="/team/pritam-cutout.png"
            imageAlt="Pritam Avuthu"
            imageSide="right"
            imagePaneClassName="justify-end px-0 pl-2 sm:pl-4 lg:pl-4"
            imageClassName="max-h-[320px] sm:max-h-[370px] lg:max-h-[400px] translate-x-[16px] translate-y-[34px]"
            body="Hello, researchers! I am excited to help you get feedback on the research papers you have worked so hard to write as your CEO. As someone who has struggled to find trustworthy feedback on my own work, it matters a lot to me that you do not run into the same problem. We want to grow this platform across disciplines and industries so people from all walks of life and levels of experience can take part in the community. We are committed to keeping DocuPeer 100% free forever, so everyone can use these resources without worrying about cost, and that only happens with your help as a peer reviewer."
          />
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

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="poiret text-4xl text-deep-text sm:text-5xl">
            Common questions about{" "}
            <span className="display text-deep-accent">DocuPeer</span>
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
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
              a: "DocuPeer is built by Aryan Patel, Co-Founder & COO, Pritam Avuthu, CEO, and Akshaj Sanikommu, CTO.",
            },
          ].map((item) => (
            <div key={item.q} className="card h-full p-7 sm:p-8">
              <h3 className="text-xl font-semibold text-deep-text">{item.q}</h3>
              <p className="mt-4 text-base leading-relaxed text-deep-text-soft">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
