import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.siteUrl;
  const paths = ["", "/boka", "/galleri", "/regler"];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/boka" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/boka" ? 0.9 : 0.7,
  }));
}
