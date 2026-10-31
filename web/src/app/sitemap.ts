import type { MetadataRoute } from "next";
import { services } from "@/config/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brixer.ng";
  const pages = ["", "/services", "/about", "/referrals", "/help", "/careers", "/privacy", "/terms", "/refund-policy"];
  return [
    ...pages.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: "monthly" as const })),
    ...services.map((service) => ({ url: `${base}/services/${service.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const }))
  ];
}
