import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "Read DocuPeer's privacy policy, terms of use, and legal information for the free peer review platform.",
  alternates: {
    canonical: "/legal",
  },
  openGraph: {
    title: "DocuPeer Legal",
    description: SITE_DESCRIPTION,
    url: "/legal",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "DocuPeer legal and privacy information",
      },
    ],
  },
};

const UPDATED = "August 18, 2026";
const CONTENT_LINKS = [
  ["Privacy", "#privacy"],
  ["Terms", "#terms"],
  ["Attributions", "#attributions"],
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-deep-border pt-10">
      <h2 className="poiret text-2xl text-deep-text md:text-3xl">{title}</h2>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-deep-text-soft">
        {children}
      </div>
    </section>
  );
}

function Clause({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-deep-text">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export default function LegalPage() {
  return (
    <div className="relative pt-24">
      <section className="mx-auto max-w-[58rem] px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,42rem)_10rem] lg:items-start">
          <div className="max-w-[42rem]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-deep-accent">
              Privacy, Terms & Attributions
            </p>
            <h1 className="poiret text-4xl text-deep-text md:text-6xl">
              Privacy, terms, and credits for{" "}
              <span className="display text-deep-accent">DocuPeer</span>.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-deep-text-soft md:text-lg">
              This page combines DocuPeer&apos;s Privacy Policy, Terms of Use,
              and attributions. It is written for the current product at{" "}
              <span className="text-deep-text">docupeer.org</span>, including
              the review interface, submissions, matching, saved history, and
              related site pages.
            </p>
            <p className="mt-6 text-sm text-deep-dim">Last updated {UPDATED}</p>
          </div>

          <nav className="lg:sticky lg:top-28 lg:justify-self-end">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-deep-accent">
              On this page
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 lg:block lg:space-y-3">
              {CONTENT_LINKS.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="block text-sm font-semibold text-deep-dim transition-colors hover:text-deep-text"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-[58rem] px-6 pb-24">
        <article className="max-w-[42rem]">
          <div className="mb-12 border-y border-deep-border py-5">
            <p className="text-sm leading-relaxed text-deep-text-soft">
              <span className="font-semibold text-deep-text">Operator.</span>{" "}
              DocuPeer is operated by the DocuPeer team. Questions about this
              page can be sent to{" "}
              <a
                href="mailto:hello@docupeer.org"
                className="text-deep-accent transition-colors hover:text-deep-text"
              >
                hello@docupeer.org
              </a>
              .
            </p>
          </div>

          <div className="space-y-14">
            <Section id="privacy" title="Privacy Policy">
              <Clause title="1. What this policy covers">
                <p>
                  This Privacy Policy explains what information DocuPeer may
                  collect, how it may be used, how it may be shared, and what
                  choices you have when you use the website, review interface,
                  submission flow, matching system, and any associated
                  communications.
                </p>
                <p>
                  DocuPeer is designed so that as much of a review as possible
                  stays on your device until you choose to submit it. That
                  means drafts, saved preferences, and in-progress annotations
                  can remain on your device instead of being transmitted to a
                  DocuPeer-operated backend.
                </p>
              </Clause>

              <Clause title="2. Information we collect">
                <p>
                  DocuPeer may collect or process the following categories of
                  information:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Information you provide directly, such as your name, email
                    address, self-declared education level, self-declared
                    specialty, and any message you send us.
                  </li>
                  <li>
                    Content you submit to the platform, such as papers you post
                    for review, and reviews or annotations you write on other
                    people&apos;s papers.
                  </li>
                  <li>
                    Device, browser, network, and usage information, such as IP
                    address, user agent, page views, navigation events,
                    performance diagnostics, crash information, and security
                    logs.
                  </li>
                  <li>
                    Data stored locally on your device, including local
                    storage, cached assets, in-progress review drafts, and
                    similar browser-side settings.
                  </li>
                  <li>
                    Information generated through your use of the product, such
                    as review counts, submission history, and feature usage,
                    used to compute your reciprocal credit balance and to
                    match you with appropriate papers.
                  </li>
                </ul>
              </Clause>

              <Clause title="3. Anonymity between authors and reviewers">
                <p>
                  DocuPeer is built around a mutual-anonymity model. Reviewers
                  do not see the identity, email, or affiliation of an
                  author. Authors do not see the identity of a reviewer;
                  reviewers are shown only as pseudonymous handles such as
                  &quot;Anonymous reviewer #1&quot;.
                </p>
                <p>
                  DocuPeer may still process identifying information
                  internally, such as to prevent abuse, enforce the review
                  ratio, and administer accounts. It is not surfaced to the
                  other side of the review.
                </p>
              </Clause>

              <Clause title="4. Cookies, local storage, and similar technologies">
                <p>
                  By using DocuPeer, you authorize DocuPeer and its service
                  providers to use cookies, local storage, cache storage,
                  server logs, diagnostics, analytics, and similar
                  technologies for product operation, session management,
                  security, abuse prevention, performance monitoring,
                  debugging, and product improvement.
                </p>
                <p>
                  Some features depend on local browser storage to function
                  correctly, including the review draft autosave and the
                  session cookie. Disabling these technologies may limit
                  functionality.
                </p>
              </Clause>

              <Clause title="5. How we use information">
                <p>DocuPeer may use information to:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>operate, maintain, secure, and improve the website and review interface;</li>
                  <li>match a paper to appropriate reviewers by specialty and level;</li>
                  <li>compute the reciprocal review-to-submission credit balance;</li>
                  <li>surface received feedback to the original author;</li>
                  <li>respond to support requests, feedback, or legal notices;</li>
                  <li>measure reliability, detect abuse, prevent fraud, and investigate incidents;</li>
                  <li>understand how the product is used and what should be improved next.</li>
                </ul>
              </Clause>

              <Clause title="6. Sharing and disclosure">
                <p>DocuPeer may share information in the following circumstances:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    with hosting, infrastructure, analytics, security, or
                    delivery providers that help operate the service;
                  </li>
                  <li>
                    with other users, in the pseudonymised, anonymised form
                    described in Section 3;
                  </li>
                  <li>
                    when required by law, legal process, court order, or a
                    good-faith belief that disclosure is necessary to protect
                    rights, safety, or property;
                  </li>
                  <li>
                    in connection with a reorganization, asset sale, financing,
                    or transfer of the business, subject to applicable law.
                  </li>
                </ul>
                <p>
                  DocuPeer does not sell personal information in the ordinary
                  consumer sense. However, service providers and infrastructure
                  partners may process technical data as part of delivering the
                  service.
                </p>
              </Clause>

              <Clause title="7. Retention">
                <p>
                  Information may be retained for as long as reasonably
                  necessary to operate the service, comply with legal
                  obligations, resolve disputes, enforce agreements, or
                  maintain security and business records.
                </p>
                <p>
                  Data stored locally in your browser may remain there until
                  you clear it or your browser removes it.
                </p>
              </Clause>

              <Clause title="8. Security">
                <p>
                  DocuPeer uses reasonable administrative, technical, and
                  organizational measures to protect information, including
                  bcrypt-hashed passwords and signed session cookies. No
                  website, storage method, or network transmission is perfectly
                  secure, so absolute security cannot be guaranteed.
                </p>
              </Clause>

              <Clause title="9. Children">
                <p>
                  DocuPeer is not intended for children under 13 and is not
                  knowingly designed to collect personal information from
                  children under 13. If you believe such information has been
                  provided, contact DocuPeer so it can be reviewed.
                </p>
              </Clause>

              <Clause title="10. Your choices">
                <p>You may be able to:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>clear local storage, cookies, or cached assets through browser settings;</li>
                  <li>request deletion of your account and associated data;</li>
                  <li>stop using the service at any time;</li>
                  <li>contact DocuPeer regarding privacy questions or requests.</li>
                </ul>
              </Clause>

              <Clause title="11. Changes to this policy">
                <p>
                  DocuPeer may update this Privacy Policy from time to time.
                  Changes become effective when posted here, unless a later
                  date is stated. Continued use of the service after updates
                  means you accept the revised policy.
                </p>
              </Clause>
            </Section>

            <Section id="terms" title="Terms of Use">
              <Clause title="1. Acceptance of these terms">
                <p>
                  By accessing or using DocuPeer, you agree to these Terms of
                  Use. If you do not agree, do not use the site.
                </p>
              </Clause>

              <Clause title="2. Who is providing the service">
                <p>
                  DocuPeer is provided by the DocuPeer team. References to
                  &quot;DocuPeer,&quot;
                  &quot;we,&quot; &quot;our,&quot; or &quot;us&quot; on this
                  page refer to that operation unless the context requires
                  otherwise.
                </p>
              </Clause>

              <Clause title="3. License and permitted use">
                <p>
                  Subject to these terms, DocuPeer grants you a limited,
                  revocable, non-exclusive, non-transferable right to access
                  and use the site for lawful personal, educational, research,
                  editorial, or internal business purposes.
                </p>
                <p>You may not use DocuPeer to:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>break the law or violate another person&apos;s rights;</li>
                  <li>submit content you do not have the right to submit;</li>
                  <li>submit content that is primarily machine-generated, or that has been generated by an AI system in a way that is intended to bypass authorship expectations;</li>
                  <li>attempt to deanonymise a reviewer or an author;</li>
                  <li>use reviews as an opportunity to harass, insult, or personally attack another user;</li>
                  <li>interfere with the service, infrastructure, or matching system;</li>
                  <li>scrape, mirror, bulk-download, or automate access in a way that is abusive, excessive, or inconsistent with these terms;</li>
                  <li>attempt to bypass security controls, rate limits, or the reciprocal review requirement.</li>
                </ul>
              </Clause>

              <Clause title="4. Ownership of submitted content">
                <p>
                  You retain ownership of the papers you submit and the reviews
                  you write. By submitting content, you grant DocuPeer a
                  worldwide, royalty-free, non-exclusive license to store, host,
                  display, and process that content solely as needed to operate
                  the service, including matching your paper with reviewers and
                  showing reviews to the original author.
                </p>
                <p>
                  DocuPeer&apos;s software, interface design, visual assets,
                  branding, page content, and product presentation are owned by
                  or licensed to DocuPeer and are protected by applicable
                  intellectual property laws.
                </p>
              </Clause>

              <Clause title="5. Reciprocity and quality">
                <p>
                  DocuPeer&apos;s core rule is that reviewers earn submission
                  credit only by producing genuine, substantive reviews.
                  Submitting empty, joke, or bad-faith reviews to game the
                  ratio is a breach of these terms and may result in
                  suspension.
                </p>
                <p>
                  DocuPeer is offered for informational, educational,
                  editorial, research, and exploratory purposes. It is not a
                  substitute for professional editing, formal academic peer
                  review, or legal review of a document.
                </p>
              </Clause>

              <Clause title="6. Availability and changes">
                <p>
                  DocuPeer may change, suspend, restrict, or discontinue any
                  feature, dataset, interface, or integration at any time, with
                  or without notice. We do not guarantee uninterrupted
                  availability or error-free operation.
                </p>
              </Clause>

              <Clause title="7. Monitoring and enforcement">
                <p>
                  You agree that DocuPeer may use reasonable monitoring,
                  logging, analytics, diagnostics, abuse-detection, and
                  security tools to protect the service and enforce these
                  terms.
                </p>
                <p>
                  DocuPeer may suspend or block access if use appears unlawful,
                  abusive, disruptive, or harmful to the product,
                  infrastructure, or other users.
                </p>
              </Clause>

              <Clause title="8. Feedback and submissions">
                <p>
                  If you send feedback, ideas, bug reports, suggestions, or
                  similar submissions (distinct from paper submissions), you
                  grant DocuPeer a worldwide, perpetual, irrevocable,
                  royalty-free license to use, adapt, publish, and incorporate
                  that feedback without compensation or obligation.
                </p>
              </Clause>

              <Clause title="9. Third-party services">
                <p>
                  DocuPeer may rely on third-party APIs, datasets, content,
                  hosting, or media services. We are not responsible for
                  third-party services, and your use of them may also be
                  subject to their separate terms or privacy policies.
                </p>
              </Clause>

              <Clause title="10. Disclaimers">
                <p>
                  To the maximum extent permitted by law, DocuPeer is provided
                  on an &quot;as is&quot; and &quot;as available&quot; basis,
                  without warranties of any kind, whether express, implied, or
                  statutory, including implied warranties of merchantability,
                  fitness for a particular purpose, non-infringement, accuracy,
                  availability, or reliability.
                </p>
              </Clause>

              <Clause title="11. Limitation of liability">
                <p>
                  To the maximum extent permitted by law, DocuPeer and its team
                  will not be liable for any indirect,
                  incidental, special, consequential, exemplary, or punitive
                  damages, or for any loss of data, profits, goodwill, business
                  opportunity, or use, arising out of or related to the
                  service, even if advised of the possibility.
                </p>
                <p>
                  To the maximum extent permitted by law, the total liability
                  of DocuPeer for claims arising out of or related to the
                  service will not exceed the
                  greater of one hundred U.S. dollars (US $100) or the amount
                  you paid directly to DocuPeer for the specific service giving
                  rise to the claim in the prior twelve months. DocuPeer is
                  currently offered free of charge.
                </p>
              </Clause>

              <Clause title="12. Indemnity">
                <p>
                  You agree to defend, indemnify, and hold harmless DocuPeer
                  and its team from claims, liabilities, damages, losses, and
                  expenses arising out of your misuse of the service, your
                  violation of these terms, or your violation of another
                  person&apos;s rights, including any claim that content you
                  submitted infringes another person&apos;s intellectual property.
                </p>
              </Clause>

              <Clause title="13. Changes to these terms">
                <p>
                  DocuPeer may revise these terms by posting an updated version
                  on this page. Continued use after changes are posted means
                  you accept the revised terms.
                </p>
              </Clause>

              <Clause title="14. Contact">
                <p>
                  Questions about these terms or the privacy policy can be
                  sent to{" "}
                  <a
                    href="mailto:hello@docupeer.org"
                    className="text-deep-accent transition-colors hover:text-deep-text"
                  >
                    hello@docupeer.org
                  </a>
                  .
                </p>
                <p>
                  If you want to continue exploring the product, you can{" "}
                  <Link
                    href="/review"
                    className="text-deep-accent transition-colors hover:text-deep-text"
                  >
                    review a paper
                  </Link>{" "}
                  or read more{" "}
                  <Link
                    href="/about"
                    className="text-deep-accent transition-colors hover:text-deep-text"
                  >
                    about DocuPeer
                  </Link>
                  .
                </p>
              </Clause>
            </Section>

            <Section id="attributions" title="Attributions">
              <Clause title="Team">
                <p>
                  DocuPeer is built by a small team. The current contributors
                  are:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-semibold text-deep-text">
                      Aryan Patel
                    </span>{" "}
                    &mdash; Co-founder & COO. Operations, community, and the
                    day-to-day work of making DocuPeer trustworthy and useful.
                  </li>
                  <li>
                    <span className="font-semibold text-deep-text">
                      Pritam Avuthu
                    </span>{" "}
                    &mdash; CEO.
                  </li>
                  <li>
                    <span className="font-semibold text-deep-text">
                      Akshaj Reddy Sanikommu
                    </span>{" "}
                    &mdash; CTO.
                  </li>
                </ul>
                <p>
                  Nothing on this page constitutes an endorsement of any
                  individual by any third party, and any views expressed
                  through the DocuPeer product are those of DocuPeer&apos;s
                  operators, not of any employer, university, or affiliated
                  organisation.
                </p>
              </Clause>

              <Clause title="Typography">
                <p>
                  DocuPeer uses Poiret One (Google Fonts, OFL) and Space
                  Grotesk (Google Fonts, OFL) for its interface, and Versailles
                  as an accent display face. Body prose for papers uses
                  Cormorant Garamond (Google Fonts, OFL). Code and monospaced
                  numerals use JetBrains Mono (JetBrains, OFL).
                </p>
              </Clause>

              <Clause title="Open-source software">
                <p>
                  DocuPeer is built on Next.js, React, Prisma, Tailwind CSS,
                  and other open-source libraries. Each of those projects is
                  licensed by its own authors under its own terms, and
                  DocuPeer&apos;s use of them does not imply endorsement of
                  DocuPeer by their maintainers.
                </p>
              </Clause>
            </Section>
          </div>
        </article>
      </section>
    </div>
  );
}
