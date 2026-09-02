"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import {
  BOOKING_MONTH,
  BOOKING_YEAR,
  daysInMonth,
  isPastDateKey,
  monthLabel,
  toDateKey,
  weekdayLabels,
} from "@/data/availability";
import {
  categoryMeta,
  formatDuration,
  getService,
  services,
  type ServiceCategory,
} from "@/data/services";

type Step = 1 | 2 | 3 | 4 | 5;

function BookingWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get("kategori");

  const [step, setStep] = useState<Step>(
    initialCategory === "naglar" || initialCategory === "fransar" ? 2 : 1,
  );
  const [category, setCategory] = useState<ServiceCategory | null>(
    initialCategory === "naglar" || initialCategory === "fransar"
      ? initialCategory
      : null,
  );
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notifyHint, setNotifyHint] = useState("");
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [slots, setSlots] = useState<
    { time: string; status: "open" | "booked" | "closed" }[]
  >([]);
  const [dayOpenCounts, setDayOpenCounts] = useState<Record<string, number>>(
    {},
  );
  const [loadingTimes, setLoadingTimes] = useState(false);

  const filteredServices = useMemo(
    () => services.filter((s) => s.category === category),
    [category],
  );

  const selectedService = serviceId ? getService(serviceId) : undefined;

  const calendarCells = useMemo(() => {
    const total = daysInMonth(BOOKING_YEAR, BOOKING_MONTH);
    const firstDow = new Date(BOOKING_YEAR, BOOKING_MONTH, 1).getDay();
    const mondayFirst = (firstDow + 6) % 7;
    const cells: Array<number | null> = Array(mondayFirst).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, []);

  useEffect(() => {
    if (step !== 4 || !serviceId) return;
    fetch(`/api/availability?serviceId=${serviceId}`)
      .then((r) => r.json())
      .then((data: { days: { dateKey: string; openCount: number }[] }) => {
        const map: Record<string, number> = {};
        for (const d of data.days) map[d.dateKey] = d.openCount;
        setDayOpenCounts(map);
      })
      .catch(() => setDayOpenCounts({}));
  }, [step, serviceId]);

  useEffect(() => {
    if (!dateKey || !serviceId) {
      setSlots([]);
      return;
    }
    setLoadingTimes(true);
    fetch(`/api/availability?date=${dateKey}&serviceId=${serviceId}`)
      .then((r) => r.json())
      .then(
        (data: {
          slots?: { time: string; status: "open" | "booked" | "closed" }[];
          open?: string[];
        }) => {
          if (data.slots?.length) {
            setSlots(data.slots);
          } else {
            setSlots(
              (data.open ?? []).map((time) => ({
                time,
                status: "open" as const,
              })),
            );
          }
        },
      )
      .catch(() => setSlots([]))
      .finally(() => setLoadingTimes(false));
  }, [dateKey, serviceId]);

  function pickCategory(cat: ServiceCategory) {
    setCategory(cat);
    setServiceId(null);
    setDateKey(null);
    setTime(null);
    setStep(2);
    router.replace(`/boka?kategori=${cat}`, { scroll: false });
  }

  function onDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setStep(4);
  }

  async function confirmBooking() {
    if (!selectedService || !dateKey || !time || !name || !phone || !email)
      return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          note,
          serviceId: selectedService.id,
          dateKey,
          time,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Något gick fel. Försök igen.");
        return;
      }
      setNotifyHint(data.notifications?.hint || "");
      setManageToken(data.booking?.manageToken || null);
      setStep(5);
    } catch {
      setSubmitError("Kunde inte nå servern. Är npm run dev igång?");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateLabel(key: string) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-28 md:px-8">
      <div className="mb-10">
        <Link
          href="/"
          className="text-[11px] uppercase tracking-[0.22em] text-ink-muted hover:text-ink"
        >
          ← Tillbaka
        </Link>
        <h1 className="mt-4 font-display text-4xl text-ink md:text-5xl">
          Boka tid
        </h1>
        <p className="mt-3 max-w-lg text-ink-muted">
          Hemmasalong i Örebro — exakt adress skickas i bekräftelsemejlet. Hör av
          dig ca 5 min innan när du är utanför. Varje behandling tar ca 2 tim +
          15 min paus.
        </p>

        {step < 5 && (
          <ol className="mt-8 flex flex-wrap gap-2">
            {(
              [
                [1, "Typ"],
                [2, "Behandling"],
                [3, "Uppgifter"],
                [4, "Tid"],
              ] as const
            ).map(([n, label]) => (
              <li
                key={n}
                className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] ${
                  step === n
                    ? "bg-ink text-white"
                    : step > n
                      ? "bg-gold/20 text-gold-deep"
                      : "bg-bg-soft text-ink-muted"
                }`}
              >
                {n}. {label}
              </li>
            ))}
          </ol>
        )}
      </div>

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["naglar", "fransar"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => pickCategory(cat)}
              className="group border border-line bg-white p-8 text-left transition hover:border-gold"
            >
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold">
                {cat === "naglar" ? "01" : "02"}
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink">
                {categoryMeta[cat].title}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {categoryMeta[cat].subtitle}
              </p>
              <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-ink group-hover:text-gold-deep">
                Välj →
              </p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && category && (
        <div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mb-6 text-sm text-ink-muted hover:text-ink"
          >
            ← Byt kategori
          </button>
          <div className="space-y-3">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  setServiceId(service.id);
                  setDateKey(null);
                  setTime(null);
                  setDayOpenCounts({});
                  setStep(3);
                }}
                className={`flex w-full items-start justify-between gap-4 border px-5 py-4 text-left transition ${
                  serviceId === service.id
                    ? "border-gold bg-bg-soft"
                    : "border-line bg-white hover:border-gold/60"
                }`}
              >
                <div>
                  <p className="font-display text-xl text-ink">{service.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDuration(service.durationMinutes)}
                  </p>
                </div>
                <p className="shrink-0 text-lg text-ink">{service.price} kr</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && selectedService && (
        <form onSubmit={onDetailsSubmit} className="max-w-lg space-y-5">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="text-sm text-ink-muted hover:text-ink"
          >
            ← Byt behandling
          </button>

          <div className="border border-line bg-bg-soft px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold">
              Vald behandling
            </p>
            <p className="mt-1 font-display text-2xl">{selectedService.name}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDuration(selectedService.durationMinutes)} ·{" "}
              {selectedService.price} kr
            </p>
          </div>

          <div className="border border-gold/35 bg-white px-5 py-4 text-sm text-ink/85">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-deep">
              Bra att veta
            </p>
            <ul className="mt-3 space-y-2">
              <li>Avboka senast 24 timmar innan.</li>
              <li>Endast kontanter — ta gärna jämna pengar.</li>
              {selectedService.category === "fransar" ? (
                <>
                  <li>Kom med rentvättade fransar, utan smink eller olja.</li>
                  <li>Undvik lösfransar med lim minst 24 h innan.</li>
                </>
              ) : null}
            </ul>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Ditt namn
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Julia Larsson"
              className="mt-2 w-full border border-line bg-white px-4 py-3.5 outline-none focus:border-gold"
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Telefon
            </span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07X XXX XX XX"
              className="mt-2 w-full border border-line bg-white px-4 py-3.5 outline-none focus:border-gold"
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              E-post
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@mail.se"
              className="mt-2 w-full border border-line bg-white px-4 py-3.5 outline-none focus:border-gold"
            />
            <span className="mt-1.5 block text-xs text-ink-muted">
              Bekräftelse + kalender skickas hit
            </span>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Meddelande (valfritt)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="T.ex. önskemål om färg"
              className="mt-2 w-full resize-none border border-line bg-white px-4 py-3.5 outline-none focus:border-gold"
            />
          </label>

          <button
            type="submit"
            className="rounded-full bg-ink px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-white transition hover:bg-gold-deep"
          >
            Välj tid →
          </button>
        </form>
      )}

      {step === 4 && category && selectedService && (
        <div>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="mb-6 text-sm text-ink-muted hover:text-ink"
          >
            ← Tillbaka till uppgifter
          </button>

          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">
            {monthLabel}
          </p>
          <h2 className="mt-2 font-display text-3xl text-ink">
            Välj dag &amp; tid
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {selectedService.name} tar ca{" "}
            {formatDuration(selectedService.durationMinutes)} + 15 min paus.
            Starttider: 10:00, 12:15, 14:30, 16:45. Röd = upptagen/stängd, vit =
            ledig. Grå tid = redan passerad idag. Grå dag = passerad.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Vill du ha både naglar och fransar samma dag? Boka två lediga tider i
            rad (t.ex. 10:00 och 12:15) — en bokning per behandling.
          </p>

          <div className="mt-8 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-ink-muted">
            {weekdayLabels.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="aspect-square" />;
              }

              const key = toDateKey(BOOKING_YEAR, BOOKING_MONTH, day);
              const past = isPastDateKey(key);
              const openCount = dayOpenCounts[key];
              const available =
                !past && (openCount === undefined || openCount > 0);
              const selected = dateKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={past || openCount === 0}
                  onClick={() => {
                    if (past) return;
                    setDateKey(key);
                    setTime(null);
                  }}
                  className={`aspect-square text-sm transition ${
                    past
                      ? "cursor-not-allowed bg-neutral-100 text-ink-muted/30"
                      : selected
                        ? "bg-ink text-white"
                        : available
                          ? "bg-bg-soft text-ink hover:bg-gold/25"
                          : "cursor-not-allowed text-ink-muted/30"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {dateKey && (
            <div className="mt-8 border-t border-line pt-8">
              <p className="font-display text-2xl capitalize text-ink">
                {formatDateLabel(dateKey)}
              </p>
              {loadingTimes ? (
                <p className="mt-3 text-sm text-ink-muted">Hämtar tider…</p>
              ) : slots.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Inga tider den dagen.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const isOpen = slot.status === "open";
                    const isBooked = slot.status === "booked";
                    const selected = time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isOpen}
                        onClick={() => isOpen && setTime(slot.time)}
                        className={`min-w-[4.5rem] rounded-full px-5 py-2.5 text-sm transition ${
                          selected
                            ? "bg-gold text-ink"
                            : isBooked
                              ? "cursor-not-allowed bg-red-500/90 text-white"
                              : isOpen
                                ? "border border-line bg-white hover:border-gold"
                                : "cursor-not-allowed bg-ink-muted/15 text-ink-muted/50"
                        }`}
                        title={
                          isBooked
                            ? "Upptagen"
                            : isOpen
                              ? "Ledig"
                              : "Stängd"
                        }
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}

              {submitError && (
                <p className="mt-4 text-sm text-red-600">{submitError}</p>
              )}

              {time && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmBooking}
                  className="mt-8 rounded-full bg-ink px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-white transition hover:bg-gold-deep disabled:opacity-60"
                >
                  {submitting ? "Sparar…" : "Bekräfta bokning"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {step === 5 && selectedService && dateKey && time && (
        <div className="border border-gold/40 bg-bg-soft px-6 py-10 text-center md:px-12">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">
            Klart
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink">
            Tack, {name.split(" ")[0]}!
          </h2>
          <p className="mx-auto mt-4 max-w-md text-ink-muted">
            Din bokning är sparad.
            {notifyHint ? ` ${notifyHint}` : ""}
          </p>
          <div className="mx-auto mt-8 max-w-md border border-line bg-white px-5 py-5 text-left text-sm">
            <p className="font-display text-xl text-ink">
              {selectedService.name}
            </p>
            <p className="mt-2 capitalize text-ink-muted">
              {formatDateLabel(dateKey)} · {time} · ca{" "}
              {formatDuration(selectedService.durationMinutes)}
            </p>
            <p className="mt-1 text-ink-muted">
              {selectedService.price} kr · {name}
            </p>
            <p className="mt-4 border-t border-line pt-4 text-xs text-ink-muted">
              Hemmasalong i Örebro — exakt adress finns i bekräftelsemejlet.
              Hör av dig ca 5 min innan när du är utanför. Kontant · avboka
              senast 24 h innan.
            </p>
            {manageToken ? (
              <Link
                href={`/hantera/${manageToken}`}
                className="mt-5 flex w-full items-center justify-center rounded-full border border-ink py-3.5 text-[11px] uppercase tracking-[0.18em] text-ink transition hover:border-red-500 hover:text-red-600"
              >
                Avboka tid
              </Link>
            ) : null}
          </div>

          {selectedService.category === "fransar" ? (
            <div className="mx-auto mt-6 max-w-md border border-gold/30 bg-white px-5 py-5 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold-deep">
                Eftervård — så håller fransarna
              </p>
              <ul className="mt-3 space-y-2 text-sm text-ink/80">
                <li>Torrt första 24 h</li>
                <li>Bara oljefria produkter runt ögonen</li>
                <li>Rengör dagligen med fransschampo</li>
                <li>Sov på rygg/sida · pilla aldrig</li>
              </ul>
              <Link
                href="/regler"
                className="mt-4 inline-block text-xs text-gold-deep underline-offset-2 hover:underline"
              >
                Läs bokningsregler &amp; eftervård →
              </Link>
            </div>
          ) : (
            <Link
              href="/regler"
              className="mx-auto mt-6 inline-block text-sm text-gold-deep underline-offset-2 hover:underline"
            >
              Bokningsregler →
            </Link>
          )}

          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-ink px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-white"
          >
            Till startsidan
          </Link>
        </div>
      )}
    </div>
  );
}

export function BookingFlow() {
  return (
    <Suspense
      fallback={
        <div className="px-5 py-28 text-center text-ink-muted">Laddar…</div>
      }
    >
      <BookingWizard />
    </Suspense>
  );
}
