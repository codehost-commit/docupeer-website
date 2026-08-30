import type { Metadata } from "next";
import { AtomForDocuPeer } from "./atom-for-docupeer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atom for DocuPeer",
  description:
    "A free assignment generator for teachers and professors, powered by Atom for DocuPeer.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function AtomPage() {
  return <AtomForDocuPeer />;
}
