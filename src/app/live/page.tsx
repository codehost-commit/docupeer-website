import type { Metadata } from "next";
import { getLiveSnapshot } from "@/lib/live";
import { LivePublic } from "./live-public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DocuPeer Live",
  description: "Watch live DocuPeer sessions, screen shares, and updates.",
};

export default async function LivePage() {
  const snapshot = await getLiveSnapshot();
  return <LivePublic initialSnapshot={snapshot} />;
}
