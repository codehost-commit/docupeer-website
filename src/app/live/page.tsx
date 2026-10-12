import type { Metadata } from "next";
import { PodcastPublic } from "./live-public";

export const metadata: Metadata = {
  title: "DocuPeer Podcasts",
  description: "Watch DocuPeer Podcasts, including 1 Minute with Ackee and new episodes from the team.",
};

export default function LivePage() {
  return <PodcastPublic />;
}
