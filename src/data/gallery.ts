export type ServiceCategory = "naglar" | "fransar";

export type GalleryItem = {
  id: number;
  label: string;
  category: ServiceCategory;
  src: string;
  /** CSS object-position — t.ex. "center 20%" så naglar syns i beskärningen */
  focus?: string;
  /** false = bara /galleri, inte startsidan */
  onHome?: boolean;
};

/**
 * Egna bilder från public/images/
 * Startsida: onHome !== false, max 6.
 */
export const galleryItems: GalleryItem[] = [
  {
    id: 8,
    label: "Rosa naglar",
    category: "naglar",
    src: "/images/rosa-naglar.jpeg",
    focus: "center 18%",
    onHome: false,
  },
  {
    id: 1,
    label: "Gelénaglar",
    category: "naglar",
    src: "/images/naglarsnygga.jpeg",
    focus: "center 25%",
  },
  {
    id: 2,
    label: "Fransar",
    category: "fransar",
    src: "/images/fransar.jpeg",
    focus: "center 20%",
  },
  {
    id: 3,
    label: "Naglar",
    category: "naglar",
    src: "/images/naglar22.jpeg",
    focus: "center 30%",
  },
  {
    id: 4,
    label: "Volymfransar",
    category: "fransar",
    src: "/images/fransar4.jpeg",
    focus: "center 22%",
  },
  {
    id: 5,
    label: "Look",
    category: "fransar",
    src: "/images/helinsnyggis.jpeg",
    focus: "center 20%",
  },
  {
    id: 6,
    label: "Fransförlängning",
    category: "fransar",
    src: "/images/fransar223.jpeg",
    focus: "center 18%",
  },
  {
    id: 7,
    label: "Beauty",
    category: "naglar",
    src: "/images/sexyhelin.jpeg",
    focus: "center 25%",
  },
];

/** Startsida — 6 bilder (utan rosa naglar) */
export const galleryPreview: GalleryItem[] = galleryItems
  .filter((i) => i.onHome !== false)
  .slice(0, 6);
