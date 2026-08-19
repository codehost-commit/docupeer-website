import type { Metadata } from "next";
import { getStatusSnapshot } from "@/lib/status";
import { StatusPublic } from "./status-public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status",
  description: "Live availability, incident updates, and maintenance notices for DocuPeer.",
  robots: {
    index: true,
    follow: true,
  },
};

export default async function StatusPage() {
  const snapshot = await getStatusSnapshot({ includeOlderReports: true });
  return <StatusPublic initialSnapshot={snapshot} />;
}
