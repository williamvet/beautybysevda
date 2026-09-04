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

const STORAGE_KEY = "bbs-sevda";

export default function SevdaPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateKey, setDateKey] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [monthLabel, setMonthLabel] = useState("");
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [busy, setBusy] = useState(false);
  const [newTime, setNewTime] = useState("11:00");
  const [hint, setHint] = useState("");

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

  const load = useCallback(async (day?: string) => {
    setError("");
    const q = day ? `?date=${encodeURIComponent(day)}` : "";
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
    setSchedule(data.schedule || []);
    setUpcoming(data.upcoming || []);
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

        <button
          type="button"
          disabled={busy}
          onClick={closeBusyPeriod}
          className="mt-6 w-full rounded-full border border-red-300 bg-red-50 py-3 text-[11px] uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          Stäng fransar 2 v + öppna naglar
        </button>

        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            Välj dag
          </h2>
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
        </section>

        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            Tider {dateKey}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Grön = ledig · Röd = bokad · Grå = stängd. Lägg till egna tider
            nedan — de syns direkt för kunder.
          </p>

          <form
            onSubmit={addTime}
            className="mt-4 flex flex-wrap items-end gap-3 border border-line bg-white px-4 py-4"
          >
            <label className="text-xs uppercase tracking-[0.14em] text-ink-muted">
              Ny starttid
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                min="10:00"
                max="18:00"
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
                          {row.booking.phone}
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
