import Link from "next/link";
import { ReviewLink } from "@/components/ReviewLink";
import { siteConfig } from "@/lib/site";

/** Enkel brygga mellan meny och galleri */
export function SoftBridge() {
  const hasReview = Boolean(siteConfig.googleReviewUrl);

  return (
    <section className="relative overflow-hidden bg-bg-soft px-5 py-12 md:px-8 md:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.jpg"
          alt="Beauty by Sevda"
          width={64}
          height={64}
          className="h-16 w-16 rounded-full object-cover ring-1 ring-gold/35"
        />
        <p className="mt-5 font-display text-2xl text-ink md:text-3xl">
          Kontant · avboka senast{" "}
          <span className="italic text-gold-deep">24 h</span> innan
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/regler"
            className="text-[11px] uppercase tracking-[0.2em] text-ink-muted hover:text-gold-deep"
          >
            Bokningsregler →
          </Link>
          {hasReview ? (
            <ReviewLink className="text-[11px] uppercase tracking-[0.2em] text-gold-deep hover:text-ink">
              Lämna en recension →
            </ReviewLink>
          ) : null}
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
      />
    </section>
  );
}
