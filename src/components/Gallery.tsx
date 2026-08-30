import Link from "next/link";
import type { GalleryItem } from "@/data/gallery";
import { siteConfig } from "@/lib/site";

type Props = {
  items: GalleryItem[];
  title?: string;
  subtitle?: string;
  moreHref?: string;
};

/**
 * GH Nails-stil: jämn grid, samma storlek, rundade hörn, hover-zoom.
 * focus styr var porträttbilder beskärs så naglar/fransar syns.
 */
export function GalleryGrid({
  items,
  title = "Galleri",
  subtitle = "Ett urval av Sevdas arbete",
  moreHref,
}: Props) {
  return (
    <section
      id="galleri"
      className="scroll-mt-24 bg-bg-soft px-5 py-12 md:px-8 md:py-14"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">
              {title}
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink md:text-[2.5rem]">
              {subtitle}
            </h2>
          </div>
          {moreHref ? (
            <Link
              href={moreHref}
              className="text-[11px] uppercase tracking-[0.18em] text-gold-deep transition hover:text-ink"
            >
              Se hela galleriet →
            </Link>
          ) : (
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] uppercase tracking-[0.18em] text-gold-deep transition hover:text-ink"
            >
              @{siteConfig.instagramHandle} →
            </a>
          )}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
          {items.map((item) => (
            <figure
              key={item.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_rgba(17,17,17,0.04)] ring-1 ring-black/[0.04] transition duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(17,17,17,0.1)] hover:ring-gold/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.label}
                loading="lazy"
                style={{ objectPosition: item.focus ?? "center center" }}
                className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-70 transition duration-500 md:opacity-0 md:group-hover:opacity-100"
                aria-hidden
              />
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-3 text-[10px] uppercase tracking-[0.18em] text-white opacity-90 transition duration-500 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                {item.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
