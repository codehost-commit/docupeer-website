export const SITE_NAME = "DocuPeer";
export const SITE_URL = "https://docupeer.org";
export const HOME_TAGLINE = "Real feedback, earned fairly";
export const SITE_TITLE = `${SITE_NAME} | ${HOME_TAGLINE}`;
export const SITE_DESCRIPTION =
  "DocuPeer is a free peer review platform founded by Rahul Awasthi, its sole Founder & CEO, where writers review 2 papers to unlock 1 submission, receive anonymous feedback, and improve faster.";
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

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/docupeer-logo.png"),
  description: SITE_DESCRIPTION,
  founder: {
    "@type": "Person",
    name: "Rahul Awasthi",
    jobTitle: "Founder & CEO",
  },
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
