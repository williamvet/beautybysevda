import Link from "next/link";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-end overflow-hidden bg-white"
    >
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/naglarsnygga.jpeg"
          alt=""
          className="h-full w-full object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/55 to-white/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-14 pt-32 md:px-8 md:pb-20">
        <div className="animate-fade-up flex items-center gap-3">
          <span className="h-px w-8 bg-gold" />
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold-deep">
            Naglar &amp; fransar
          </p>
        </div>

        <h1 className="animate-fade-up delay-1 mt-4 max-w-3xl font-display text-[clamp(3.4rem,11vw,6.8rem)] font-medium leading-[0.92] tracking-tight text-ink">
          Beauty by <span className="italic text-gold-deep">Sevda</span>
        </h1>

        <p className="animate-fade-up delay-2 mt-5 max-w-md text-[15px] leading-relaxed text-ink/70 md:text-base">
          Boka bland publicerade tider. Bekräftelse till dig — och till Sevda.
        </p>

        <div className="animate-fade-up delay-3 mt-8 flex flex-wrap gap-3">
          <Link
            href="/boka"
            className="rounded-full bg-ink px-7 py-3 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-gold-deep"
          >
            Boka din tid
          </Link>
          <Link
            href="/#meny"
            className="rounded-full border border-ink/15 bg-white/70 px-7 py-3 text-[11px] uppercase tracking-[0.18em] text-ink backdrop-blur-sm transition hover:border-gold hover:text-gold-deep"
          >
            Se priser
          </Link>
        </div>
      </div>
    </section>
  );
}
