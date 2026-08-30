"use client";

import { useMemo, useState } from "react";
import { GalleryGrid } from "@/components/Gallery";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { galleryItems, type GalleryItem } from "@/data/gallery";
import type { ServiceCategory } from "@/data/services";

function FullGallery() {
  const [tab, setTab] = useState<ServiceCategory | "alla">("alla");

  const filtered = useMemo(() => {
    if (tab === "alla") return galleryItems;
    return galleryItems.filter((g) => g.category === tab);
  }, [tab]);

  return (
    <div>
      <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 pt-28 md:px-8">
        {(
          [
            ["alla", "Alla"],
            ["naglar", "Naglar"],
            ["fransar", "Fransar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition ${
              tab === id
                ? "bg-ink text-white"
                : "border border-line bg-white text-ink/70 hover:border-gold hover:text-gold-deep"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <GalleryGrid
        items={filtered as GalleryItem[]}
        title="Galleri"
        subtitle="Alla bilder"
      />
    </div>
  );
}

export default function GalleriPage() {
  return (
    <>
      <Nav />
      <main>
        <FullGallery />
      </main>
      <Footer />
    </>
  );
}
