import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://brixer.ng"),
  title: { default: "Brixer — Business compliance, beautifully handled", template: "%s | Brixer" },
  description: "Register, protect, and grow your Nigerian business with one calm, trackable compliance platform.",
  openGraph: {
    title: "Brixer — Business compliance, beautifully handled",
    description: "CAC registration, trademark, tax and corporate banking support in one place.",
    type: "website",
    locale: "en_NG",
    siteName: "Brixer"
  },
  twitter: { card: "summary_large_image" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${playfair.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
