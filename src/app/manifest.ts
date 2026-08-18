import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DocuPeer",
    short_name: "DocuPeer",
    description:
      "A free peer review platform for research papers. Review 2 papers, unlock 1 submission, and receive anonymous feedback.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#356d97",
    lang: "en",
    categories: ["education", "productivity", "writing", "research"],
    icons: [
      {
        src: "/app-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
  };
}
