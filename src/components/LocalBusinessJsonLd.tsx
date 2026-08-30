import { siteConfig } from "@/lib/site";

/** Lokalt företag — hjälper Google förstå Örebro + bokningssida */
export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: siteConfig.brand,
    url: siteConfig.siteUrl,
    image: `${siteConfig.siteUrl}/images/logo.jpg`,
    description: `Personlig hemmasalong i ${siteConfig.city}. Gelénaglar, akryl och fransförlängning. Boka online.`,
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.city,
      addressCountry: "SE",
    },
    areaServed: {
      "@type": "City",
      name: siteConfig.city,
    },
    sameAs: [siteConfig.instagramUrl, siteConfig.tiktokUrl],
    priceRange: "$$",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
