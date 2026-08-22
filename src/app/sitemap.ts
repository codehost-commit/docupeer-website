import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const LAST_MODIFIED = new Date("2026-08-18T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
