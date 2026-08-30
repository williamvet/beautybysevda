import Link from "next/link";
import { siteConfig } from "@/lib/site";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <radialGradient id="ig" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.2" fill="#fff" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#111" />
      <path
        fill="#25F4EE"
        d="M16.2 6.2c.55.65 1.3 1.15 2.15 1.35v1.85a5.3 5.3 0 0 1-2.7-.9v4.7a4.35 4.35 0 1 1-4.35-4.35c.3 0 .58.04.85.1v1.95a2.4 2.4 0 1 0 1.7 2.3V5.4h2.35v.8z"
        transform="translate(.4 .35)"
      />
      <path
        fill="#FE2C55"
        d="M16.2 6.2c.55.65 1.3 1.15 2.15 1.35v1.85a5.3 5.3 0 0 1-2.7-.9v4.7a4.35 4.35 0 1 1-4.35-4.35c.3 0 .58.04.85.1v1.95a2.4 2.4 0 1 0 1.7 2.3V5.4h2.35v.8z"
        transform="translate(-.35 -.2)"
      />
      <path
        fill="#fff"
        d="M16.2 6.2c.55.65 1.3 1.15 2.15 1.35v1.85a5.3 5.3 0 0 1-2.7-.9v4.7a4.35 4.35 0 1 1-4.35-4.35c.3 0 .58.04.85.1v1.95a2.4 2.4 0 1 0 1.7 2.3V5.4h2.35v.8z"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="gold-rule" />

      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.jpg"
              alt="Beauty by Sevda"
              width={72}
              height={72}
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-gold/30"
            />
            <div>
              <p className="font-display text-2xl text-ink">
                Beauty by <span className="italic text-gold-deep">Sevda</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Gelé · Akryl · Singel · Mix · Volym
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">
              Sidor
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink/70">
              <li>
                <Link href="/#meny" className="hover:text-gold-deep">
                  Meny
                </Link>
              </li>
              <li>
                <Link href="/regler" className="hover:text-gold-deep">
                  Bokningsregler
                </Link>
              </li>
              <li>
                <Link href="/galleri" className="hover:text-gold-deep">
                  Galleri
                </Link>
              </li>
              <li>
                <Link href="/boka" className="hover:text-gold-deep">
                  Boka
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">
              Följ oss
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={siteConfig.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="transition hover:opacity-80"
              >
                <InstagramIcon className="h-9 w-9" />
              </a>
              <a
                href={siteConfig.tiktokUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="transition hover:opacity-80"
              >
                <TikTokIcon className="h-9 w-9" />
              </a>
            </div>
            <Link
              href="/boka"
              className="mt-6 inline-flex rounded-full border border-gold/50 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-gold-deep transition hover:border-ink hover:bg-ink hover:text-white"
            >
              Boka tid
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Beauty by Sevda</p>
          <p>Boka online · kontant på plats</p>
        </div>
      </div>
    </footer>
  );
}
