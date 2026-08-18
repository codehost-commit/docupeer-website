import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review Papers",
  description:
    "Review anonymous papers on DocuPeer and help other writers improve through constructive feedback.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
