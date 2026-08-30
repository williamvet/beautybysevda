import Link from "next/link";
import {
  afterLashes,
  afterNails,
  beforeLashes,
  beforeNails,
  bookingRules,
} from "@/data/care";
import { siteConfig } from "@/lib/site";

/** Alltid synlig — ingen klick. Används på /regler */
export function CareInfo() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(196,165,116,0.16),transparent_50%),radial-gradient(ellipse_at_85%_40%,rgba(17,17,17,0.03),transparent_45%)]"
      />

      <div className="relative mx-auto max-w-5xl px-5 py-28 md:px-8">
        <Link
          href="/"
          className="text-[11px] uppercase tracking-[0.22em] text-ink-muted hover:text-ink"
        >
          ← Tillbaka
        </Link>

        <p className="mt-8 text-[11px] uppercase tracking-[0.28em] text-gold-deep">
          Beauty by Sevda
        </p>
        <h1 className="mt-3 font-display text-4xl text-ink md:text-5xl">
          Bokningsregler
        </h1>
        <p className="mt-4 max-w-md text-ink-muted">
          Läs innan du bokar — kontant, avbokning och kort vård för naglar och
          fransar.
        </p>

        <section className="mt-14 border-y border-line py-10">
          <h2 className="font-display text-2xl text-ink md:text-3xl">
            Bokningsregler
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {bookingRules.map((r, i) => (
              <div key={r.title}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-gold">
                  0{i + 1}
                </p>
                <p className="mt-3 font-display text-xl text-ink">{r.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">
            Naglar
          </p>
          <h2 className="mt-2 font-display text-3xl text-ink">Nagelvård</h2>
          <p className="mt-3 max-w-md text-sm text-ink-muted">
            Kort guide före och efter gelé eller akryl.
          </p>
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                Innan
              </p>
              <ul className="mt-4 space-y-3">
                {beforeNails.map((line) => (
                  <li
                    key={line}
                    className="text-[15px] leading-relaxed text-ink/85"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                Efter
              </p>
              <ul className="mt-4 space-y-3">
                {afterNails.map((line) => (
                  <li
                    key={line}
                    className="text-[15px] leading-relaxed text-ink/85"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">
              Fransar
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink">
              Innan behandling
            </h2>
            <p className="mt-3 text-sm text-ink-muted">
              Läs innan du kommer — det påverkar hur bra fransarna fäster.
            </p>
          </div>
          <ol className="space-y-6">
            {beforeLashes.map((line, i) => (
              <li key={line} className="flex gap-4">
                <span className="font-display text-2xl text-gold-soft">
                  {i + 1}
                </span>
                <p className="pt-1 text-[15px] leading-relaxed text-ink/85">
                  {line}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 border border-gold/30 bg-white/70 px-6 py-10 md:px-10 md:py-12">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">
            Fransar
          </p>
          <h2 className="mt-2 font-display text-3xl text-ink">Eftervård</h2>
          <p className="mt-3 max-w-md text-sm text-ink-muted">
            Gör så här så håller setet längre.
          </p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2">
            {afterLashes.map((line, i) => (
              <li key={line} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-gold/40 font-display text-sm text-gold-deep">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-ink/85">{line}</p>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-12 text-sm text-ink-muted">
          Frågor? Skriv till{" "}
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gold-deep underline-offset-2 hover:underline"
          >
            @{siteConfig.instagramHandle}
          </a>
          .
        </p>

        <Link
          href="/boka"
          className="mt-8 inline-flex rounded-full bg-ink px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-white transition hover:bg-gold-deep"
        >
          Boka tid
        </Link>
      </div>
    </div>
  );
}
