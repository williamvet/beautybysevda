import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `Fransförlängning & Naglar i ${siteConfig.city} | ${siteConfig.brand}`,
    template: `%s | ${siteConfig.brand}`,
  },
  description: `Personlig hemmasalong i ${siteConfig.city}. Gelénaglar, akryl, singelfransar och volymfransar. Boka din tid smidigt online hos ${siteConfig.brand}.`,
  keywords: [
    "fransförlängning Örebro",
    "naglar Örebro",
    "gelénaglar Örebro",
    "volymfransar Örebro",
    "Beauty by Sevda",
    "hemmasalong Örebro",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: siteConfig.siteUrl,
    siteName: siteConfig.brand,
    title: `Fransförlängning & Naglar i ${siteConfig.city} | ${siteConfig.brand}`,
    description: `Personlig hemmasalong i ${siteConfig.city}. Boka gelénaglar, akryl och fransförlängning online.`,
  },
  twitter: {
    card: "summary_large_image",
    title: `Fransförlängning & Naglar i ${siteConfig.city} | ${siteConfig.brand}`,
    description: `Personlig hemmasalong i ${siteConfig.city}. Boka din tid online.`,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/images/logo.jpg", type: "image/jpeg" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sv"
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-ink bg-bg">
        {children}
      </body>
    </html>
  );
}
