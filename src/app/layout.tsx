import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";

export const metadata: Metadata = {
  title: "DocuPeer. Free peer review for your papers.",
  description:
    "Review 2 papers, unlock 1 submission. A 100% free peer-review community where people help people write better.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/app-icon.png", sizes: "512x512" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono:wght@400;500&family=Poiret+One&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-deep-bg text-deep-text antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
