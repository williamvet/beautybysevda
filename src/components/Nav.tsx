"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site";

const links = [
  { href: "/#meny", label: "Meny" },
  { href: "/galleri", label: "Galleri" },
  { href: "/regler", label: "Bokningsregler" },
  { href: "/boka", label: "Boka" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-line bg-white/95 backdrop-blur-md"
          : "border-transparent bg-white"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.jpg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-gold/30"
          />
          <span>
            <span className="font-display text-[1.3rem] font-medium tracking-[0.03em] text-ink md:text-[1.55rem]">
              Beauty by <span className="italic text-gold-deep">Sevda</span>
            </span>
            <span className="mt-0.5 block h-px w-8 bg-gold transition-all duration-400 group-hover:w-full" />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] uppercase tracking-[0.2em] text-ink/70 transition hover:text-gold-deep"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] uppercase tracking-[0.2em] text-ink/70 transition hover:text-gold-deep"
          >
            Instagram
          </a>
          <Link
            href="/boka"
            className="rounded-full bg-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-gold-deep"
          >
            Boka tid
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Stäng meny" : "Öppna meny"}
          className="flex h-10 w-10 items-center justify-center lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex w-5 flex-col gap-1.5">
            <span
              className={`h-px w-full bg-ink transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-full bg-ink transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`h-px w-full bg-ink transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-5 py-5 lg:hidden">
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-display text-xl text-ink"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-gold-deep"
            >
              @{siteConfig.instagramHandle}
            </a>
            <Link
              href="/boka"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex w-fit rounded-full bg-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white"
            >
              Boka tid
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
