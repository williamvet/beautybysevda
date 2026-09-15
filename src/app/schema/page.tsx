"use client";

import { useCallback, useEffect, useState } from "react";

type ScheduleRow = {
  time: string;
  custom?: boolean;
  status: "open" | "booked" | "closed" | "blocked";
  label: string;
  booking: {
    id: string;
    name: string;
    phone: string;
    email: string;
    serviceName: string;
    price: number;
  } | null;
};

type Upcoming = {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceName: string;
  dateKey: string;
  time: string;
  price: number;
};

type AdminService = {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
};

const STORAGE_KEY = "bbs-sevda";

export default function SevdaPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateKey, setDateKey] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [monthLabel, setMonthLabel] = useState("");
  const [viewMonth, setViewMonth] = useState<number | null>(null); // 0–11
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [busy, setBusy] = useState(false);
  const [newTime, setNewTime] = useState("17:30");
  const [hint, setHint] = useState("");
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [bookServiceId, setBookServiceId] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookSendMail, setBookSendMail] = useState(true);

  function headers() {
    const pw =
      password ||
      (typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(STORAGE_KEY) || ""
        : "");
    return {
      "Content-Type": "application/json",
      "x-sevda-password": pw,
    };
  }

  const load = useCallback(async (day?: string, monthIndex?: number) => {
    setError("");
    const params = new URLSearchParams();
    if (day) params.set("date", day);
    if (typeof monthIndex === "number") params.set("month", String(monthIndex + 1));
    const q = params.toString() ? `?${params}` : "";
    const res = await fetch(`/api/sevda${q}`, { headers: headers() });
    const data = await res.json();
    if (!res.ok) {
      setAuthed(false);
      sessionStorage.removeItem(STORAGE_KEY);
      throw new Error(data.error || "Kunde inte ladda");
    }
    setAuthed(true);
    setDateKey(data.dateKey);
    setDays(data.days || []);
    setMonthLabel(data.monthLabel || "");
    if (typeof data.month === "number") setViewMonth(data.month);
    setSchedule(data.schedule || []);
    setUpcoming(data.upcoming || []);
    if (Array.isArray(data.services) && data.services.length) {
      setServices(data.services);
      setBookServiceId((prev) => prev || data.services[0]?.id || "");
    }
    const openTimes = (data.schedule || [])
      .filter((r: ScheduleRow) => r.status === "open")
      .map((r: ScheduleRow) => r.time);
    setBookTime((prev) =>
      prev && openTimes.includes(prev) ? prev : openTimes[0] || "",
    );
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    setPassword(saved);
    load()
      .catch(() => setError("Logga in igen."))
      .finally(() => setLoading(false));
  }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sevda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fel lösenord");
      sessionStorage.setItem(STORAGE_KEY, password);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function pickDay(key: string) {
    setBusy(true);
    setError("");
    try {
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSlot(time: string, closed: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sevda", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          action: "toggle-slot",
          dateKey,
          time,
          closed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte ändra");
      setSchedule(data.schedule || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm("Avboka kunden? Hon/han och du får mejl, tiden blir ledig."))
      return;
    setBusy(true);
    setError("");
    setHint("");
    try {
      const res = await fetch("/api/sevda", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "cancel", id, dateKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte avboka");
      if (data.schedule) setSchedule(data.schedule);
      await load(dateKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function addTime(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setHint("");
    try {
      const res = await fetch("/api/sevda", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          action: "add-slot",
          dateKey,
          time: newTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte lägga till");
      setSchedule(data.schedule || []);
      setHint(data.message || "Tid tillagd.");
      await load(dateKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function removeCustom(time: string) {
    if (!confirm(`Ta bort egen tid ${time}?`)) return;
    setBusy(true);
    setError("");
    setHint("");
    try {
      const res = await fetch("/api/sevda", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          action: "remove-slot",
          dateKey,
          time,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte ta bort");
      setSchedule(data.schedule || []);
      await load(dateKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function bookManual(e: React.FormEvent) {
    e.preventDefault();
    if (!bookTime) {
      setError("Välj en ledig tid först (eller lägg till 17:30 ovan).");
      return;
    }
    setBusy(true);
    setError("");
    setHint("");
    try {
      const res = await fetch("/api/sevda", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          action: "book-manual",
          dateKey,
          time: bookTime,
          name: bookName,
          phone: bookPhone,
          email: bookEmail,
          serviceId: bookServiceId,
          sendEmails: bookSendMail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte boka");
      setHint(data.message || "Kunden är inbokad.");
      if (data.schedule) setSchedule(data.schedule);
      if (data.upcoming) setUpcoming(data.upcoming);
      setBookName("");
      setBookPhone("");
      setBookEmail("");
      await load(dateKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function closeBusyPeriod() {
    // Fransar: idag → +14 dagar. Naglar: öppna igen (inga mejl, rör ej bokningar).
    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Stockholm" }),
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    const keyOf = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const from = keyOf(today);
    const toFransar = new Date(today);
    toFransar.setDate(toFransar.getDate() + 15); // t.o.m. ~19 sep från 4 sep
    const toFransarKey = keyOf(toFransar);

    if (
      !confirm(
        `Stäng FRANSAR ${from}–${toFransarKey} (röda)?\nÖppna alla NAGLAR igen?\n\nRör inte befintliga bokningar. Inga mejl.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setHint("");
    try {
      const fransar = await fetch("/api/sevda", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          action: "close-range",
          fromDateKey: from,
          toDateKey: toFransarKey,
          category: "fransar",
          dateKey,
        }),
      });
      const fransarData = await fransar.json();
      if (!fransar.ok)
        throw new Error(fransarData.error || "Kunde inte stänga fransar");

      const naglar = await fetch("/api/sevda", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          action: "open-range",
          fromDateKey: from,
          toDateKey: "2026-09-30",
          category: "naglar",
          dateKey,
        }),
      });
      const naglarData = await naglar.json();
      if (!naglar.ok)
        throw new Error(naglarData.error || "Kunde inte öppna naglar");

      setHint(
        `Klart: fransar stängda ${from}–${toFransarKey}. Naglar öppna igen. Bokningar orörda.`,
      );
      if (naglarData.schedule) setSchedule(naglarData.schedule);
      else if (fransarData.schedule) setSchedule(fransarData.schedule);
      else await load(dateKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  function dayLabel(key: string) {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("sv-SE", {
      weekday: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-svh bg-bg-soft px-5 py-16">
        <p className="text-sm text-ink-muted">Laddar…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-svh bg-bg-soft px-5 py-16">
        <div className="mx-auto max-w-sm">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">
            Beauty by Sevda
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">Mitt schema</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Bara för dig — se bokningar, stäng tider eller öppna lediga igen.
          </p>
          <form onSubmit={login} className="mt-8 space-y-4">
            <label className="block text-xs uppercase tracking-[0.16em] text-ink-muted">
              Lösenord
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-gold"
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !password}
              className="w-full rounded-full bg-ink py-3.5 text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-50"
            >
              {busy ? "Öppnar…" : "Öppna schema"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-bg-soft px-5 py-10 pb-24 md:px-8">
      <div className="mx-auto max-w-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">
              Beauty by Sevda
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink md:text-4xl">
              Mitt schema
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{monthLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              setAuthed(false);
              setPassword("");
            }}
            className="text-[11px] uppercase tracking-[0.16em] text-ink-muted hover:text-ink"
          >
            Logga ut
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {hint ? <p className="mt-4 text-sm text-emerald-700">{hint}</p> : null}

        <div className="mt-6 border border-gold/40 bg-white px-4 py-4 text-sm leading-relaxed text-ink/80">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep">
            Så här använder du schemat
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Stäng</strong> = tiden blir otillgänglig (grå) för kunder
            </li>
            <li>
              <strong>Öppna</strong> = tiden blir ledig (grön) igen
            </li>
            <li>
              <strong>Lägg till tid</strong> = egen starttid t.ex. 17:30 (syns
              för kunder)
            </li>
            <li>
              <strong>Boka in kund</strong> = när någon skriver på SMS/Messenger
              — ni får båda mejl
            </li>
            <li>
              <strong>Avboka</strong> = tar bort bokningen och skickar mejl
            </li>
          </ul>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={closeBusyPeriod}
          className="mt-4 w-full rounded-full border border-red-300 bg-red-50 py-3 text-[11px] uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          Stäng fransar 2 v + öppna naglar
        </button>

        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            Välj dag
          </h2>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={busy || viewMonth === null || viewMonth <= 0}
              onClick={async () => {
                if (viewMonth === null || viewMonth <= 0) return;
                const m = viewMonth - 1;
                setBusy(true);
                try {
                  await load(undefined, m);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Fel");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.14em] disabled:opacity-30"
            >
              ← Månad
            </button>
            <p className="text-sm text-ink">{monthLabel}</p>
            <button
              type="button"
              disabled={busy || viewMonth === null || viewMonth >= 11}
              onClick={async () => {
                if (viewMonth === null || viewMonth >= 11) return;
                const m = viewMonth + 1;
                setBusy(true);
                try {
                  await load(undefined, m);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Fel");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.14em] disabled:opacity-30"
            >
              Månad →
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {days.map((key) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => pickDay(key)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs capitalize transition ${
                  key === dateKey
                    ? "bg-ink text-white"
                    : "border border-line bg-white text-ink hover:border-gold"
                }`}
              >
                {dayLabel(key)}
              </button>
            ))}
          </div>
          {days.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              Inga kvarvarande dagar denna månad — byt månad.
            </p>
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            Tider {dateKey}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Grön = ledig · Röd = bokad · Grå = stängd. Egna tider (t.ex. 17:30)
            syns för kunder automatiskt.
          </p>

          <form
            onSubmit={addTime}
            className="mt-4 flex flex-wrap items-end gap-3 border border-line bg-white px-4 py-4"
          >
            <label className="text-xs uppercase tracking-[0.14em] text-ink-muted">
              Ny starttid (t.ex. 17:30)
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                min="10:00"
                max="17:45"
                step={900}
                className="mt-2 block w-36 border border-line bg-bg-soft px-3 py-2.5 text-base text-ink"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !newTime}
              className="rounded-full bg-ink px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white disabled:opacity-50"
            >
              Lägg till tid
            </button>
          </form>

          <form
            onSubmit={bookManual}
            className="mt-4 space-y-3 border border-emerald-200 bg-emerald-50/40 px-4 py-4"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-800">
              Boka in kund (SMS / Messenger)
            </p>
            <p className="text-xs text-ink-muted">
              Fyll i uppgifterna — bokningen sparas och mejl skickas (om du
              lämnar rutan ikryssad).
            </p>
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-muted">
              Namn
              <input
                required
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink"
                placeholder="Kundens namn"
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-muted">
              Telefon
              <input
                required
                type="tel"
                value={bookPhone}
                onChange={(e) => setBookPhone(e.target.value)}
                className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink"
                placeholder="07X XXX XX XX"
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-muted">
              E-post (för bekräftelse)
              <input
                required
                type="email"
                value={bookEmail}
                onChange={(e) => setBookEmail(e.target.value)}
                className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink"
                placeholder="kund@mail.se"
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-muted">
              Tjänst
              <select
                required
                value={bookServiceId}
                onChange={(e) => setBookServiceId(e.target.value)}
                className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.category === "naglar" ? "Naglar" : "Fransar"} · {s.name}{" "}
                    ({s.price} kr)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-muted">
              Ledig tid
              <select
                required
                value={bookTime}
                onChange={(e) => setBookTime(e.target.value)}
                className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink"
              >
                {schedule
                  .filter((r) => r.status === "open")
                  .map((r) => (
                    <option key={r.time} value={r.time}>
                      {r.time}
                      {r.custom ? " (egen)" : ""}
                    </option>
                  ))}
              </select>
            </label>
            {schedule.every((r) => r.status !== "open") ? (
              <p className="text-xs text-red-600">
                Ingen ledig tid denna dag — lägg till 17:30 eller öppna en stängd
                tid.
              </p>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={bookSendMail}
                onChange={(e) => setBookSendMail(e.target.checked)}
              />
              Skicka bekräftelsemejl till kund (+ notis till dig)
            </label>
            <button
              type="submit"
              disabled={busy || !bookTime}
              className="w-full rounded-full bg-emerald-800 py-3 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-50"
            >
              {busy ? "Sparar…" : "Boka in kund"}
            </button>
          </form>

          <ul className="mt-4 space-y-3">
            {schedule.map((row) => {
              const isBooked = row.status === "booked";
              const isClosed = row.status === "closed";
              const isBlocked = row.status === "blocked";
              const isOpen = row.status === "open";

              return (
                <li
                  key={row.time}
                  className={`border px-4 py-4 ${
                    isBooked
                      ? "border-red-200 bg-red-50"
                      : isClosed || isBlocked
                        ? "border-line bg-white/60 opacity-70"
                        : "border-emerald-200 bg-emerald-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl text-ink">
                        {row.time}
                        {row.custom ? (
                          <span className="ml-2 align-middle text-[10px] uppercase tracking-[0.14em] text-gold-deep">
                            egen
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">{row.label}</p>
                      {row.booking ? (
                        <p className="mt-2 text-xs text-ink-muted">
                          Tel {row.booking.phone}
                          {row.booking.email ? ` · ${row.booking.email}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {isBooked && row.booking ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => cancel(row.booking!.id)}
                          className="rounded-full border border-red-300 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-red-700"
                        >
                          Avboka
                        </button>
                      ) : null}
                      {isOpen ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleSlot(row.time, true)}
                          className="rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-ink"
                        >
                          Stäng
                        </button>
                      ) : null}
                      {isClosed ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleSlot(row.time, false)}
                          className="rounded-full bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white"
                        >
                          Öppna
                        </button>
                      ) : null}
                      {row.custom && !isBooked && !isBlocked ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeCustom(row.time)}
                          className="rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-ink-muted"
                        >
                          Ta bort
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            Kommande bokningar
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Passerade bokningar tas bort automatiskt från listan.
          </p>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Inga aktiva bokningar.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcoming.map((b) => (
                <li
                  key={b.id}
                  className="flex items-start justify-between gap-3 border border-line bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-ink">
                      {b.dateKey} · {b.time}
                    </p>
                    <p className="mt-0.5 font-display text-xl text-ink">
                      {b.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {b.serviceName} · {b.price} kr
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => cancel(b.id)}
                    className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-red-700"
                  >
                    Avboka
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
