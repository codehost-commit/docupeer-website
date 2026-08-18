import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Paper",
  description:
    "Submit your paper to DocuPeer after earning a submission credit through peer review.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
