"use client";

import Link from "next/link";
import { useState } from "react";
import {
  categoryMeta,
  formatDuration,
  services,
  type ServiceCategory,
} from "@/data/services";

export function Services() {
  const [tab, setTab] = useState<ServiceCategory>("naglar");
  const items = services.filter((s) => s.category === tab);
  const meta = categoryMeta[tab];

  return (
    <section id="meny" className="scroll-mt-24 bg-white px-5 py-14 md:px-8 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">
              Meny
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink md:text-4xl">
              Naglar &amp; fransar
            </h2>
          </div>

          <div className="flex gap-2">
            {(["naglar", "fransar"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.16em] transition ${
                  tab === id
                    ? "bg-ink text-white"
                    : "border border-line text-ink/70 hover:border-gold hover:text-gold-deep"
                }`}
              >
                {categoryMeta[id].title}
              </button>
            ))}
          </div>
        </div>

        <div
          id={tab}
          className="mt-8 scroll-mt-28 border-t border-line pt-2"
        >
          <div className="mb-2 flex items-center justify-between gap-3 py-3">
            <p className="text-sm text-ink-muted">{meta.subtitle}</p>
            <Link
              href={`/boka?kategori=${tab}`}
              className="text-[11px] uppercase tracking-[0.16em] text-gold-deep transition hover:text-ink"
            >
              Boka {meta.title.toLowerCase()} →
            </Link>
          </div>

          <ul>
            {items.map((service) => (
              <li
                key={service.id}
                className="flex items-baseline justify-between gap-4 border-b border-line py-3"
              >
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-ink md:text-xl">
                    {service.name}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-ink-muted md:text-sm">
                    {formatDuration(service.durationMinutes)}
                    {service.note ? ` · ${service.note}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-ink md:text-base">
                  {service.price} kr
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
