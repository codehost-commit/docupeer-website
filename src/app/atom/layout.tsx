import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "Atom by DocuPeer" },
  description: "Track your grades, assignments, tests, projects, and deadlines — all in one place.",
  manifest: "/atom-manifest.webmanifest",
  appleWebApp: { capable: true, title: "Atom", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#356d97",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function AtomLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Atom is a full-screen app: hide the marketing site's nav and footer. */}
      <style>{`.site-nav,.site-footer{display:none!important}`}</style>
      {children}
    </>
  );
}
