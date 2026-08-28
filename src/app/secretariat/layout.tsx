import type { Metadata } from "next";
// KaTeX stylesheet for rendering LaTeX math in replies. Scoped to this route.
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Secretariat",
  description:
    "Secretariat reads your paper and gives detailed, constructive feedback. Earn prompts by reviewing peers.",
  robots: { index: false, follow: true },
};

export default function SecretariatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
