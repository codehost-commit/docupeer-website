export const SITE_NAME = "DocuPeer";
export const SITE_URL = "https://docupeer.org";
export const HOME_TAGLINE = "Real feedback, earned fairly";
export const SITE_TITLE = `${SITE_NAME} | ${HOME_TAGLINE}`;
export const SITE_DESCRIPTION =
  "DocuPeer is a free peer review platform where writers review 2 papers to unlock 1 submission, receive anonymous feedback, and improve faster. Serving 40,000 users across 13,000 research papers.";
export const SITE_KEYWORDS = [
  "peer review platform",
  "free peer review",
  "research paper feedback",
  "paper review service",
  "academic peer review",
  "anonymous peer review",
  "writing feedback platform",
  "research paper reviewers",
  "essay review platform",
  "student paper feedback",
  "review research papers online",
  "Rahul Awasthi",
];

export const PUBLIC_STATS = {
  users: "40,000",
  papers: "13,000",
};

export const PUBLIC_DISPLAY_STATS = {
  users: "thousands",
  papers: PUBLIC_STATS.papers,
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/logo.png"),
  description: SITE_DESCRIPTION,
  founder: [
    {
      "@type": "Person",
      name: "Rahul Awasthi",
      jobTitle: "Co-Founder & CEO",
    },
    {
      "@type": "Person",
      name: "Aryan Patel",
      jobTitle: "Co-Founder & COO",
    },
  ],
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
  },
};
