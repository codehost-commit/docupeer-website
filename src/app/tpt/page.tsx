import type { Metadata } from "next";
import { getPublicTalk } from "@/lib/tpt";
import { SITE_DESCRIPTION, absoluteUrl } from "@/lib/seo";
import { TptPublic } from "./tpt-public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The People's Talk",
  description:
    "Read community feedback about DocuPeer and submit your own note for admin review.",
  alternates: {
    canonical: "/tpt",
  },
  openGraph: {
    title: "The People's Talk",
    description: SITE_DESCRIPTION,
    url: "/tpt",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "DocuPeer community feedback",
      },
    ],
  },
};

export default async function TptPage() {
  const payload = await getPublicTalk();
  return <TptPublic initialPayload={payload} />;
}
