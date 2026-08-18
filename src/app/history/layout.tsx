import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "History",
  description:
    "View the feedback you have received and the reviews you have completed on DocuPeer.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
