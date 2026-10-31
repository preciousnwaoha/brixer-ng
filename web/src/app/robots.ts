import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brixer.ng";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/staff", "/admin", "/api"] }],
    sitemap: `${base}/sitemap.xml`
  };
}
