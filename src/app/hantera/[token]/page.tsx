"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Info = {
  status: string;
  name: string;
  serviceName: string;
  dateKey: string;
  time: string;
  price: number;
};

export default function HanteraPage() {
  const params = useParams();
  const token = String(params.token || "");
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/bookings/cancel?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Fel");
        setInfo(data.booking);
        if (data.booking.status === "cancelled") setDone(true);
      })
      .catch((e: Error) => setError(e.message || "Kunde inte hitta bokningen."))
      .finally(() => setLoading(false));
  }, [token]);

  async function cancel() {
    if (!confirm("Vill du avboka tiden? Den blir ledig för andra.")) return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte avboka");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="min-h-svh bg-white px-5 py-16 md:px-8">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-[11px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
        >
          ← Beauty by Sevda
        </Link>

        <h1 className="mt-6 font-display text-3xl text-ink md:text-4xl">
          Din bokning
        </h1>

        {loading && (
          <p className="mt-6 text-sm text-ink-muted">Hämtar…</p>
        )}

        {error && !loading && (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        )}

        {info && !loading && (
          <div className="mt-8 border border-line bg-bg-soft px-5 py-6">
            <p className="font-display text-2xl text-ink">{info.serviceName}</p>
            <p className="mt-2 text-sm text-ink-muted">
              {info.dateKey} · {info.time} · {info.price} kr
            </p>
            <p className="mt-1 text-sm text-ink-muted">{info.name}</p>

            {done ? (
              <p className="mt-6 text-sm text-ink">
                Tiden är avbokad. Du kan boka en ny tid när du vill.
              </p>
            ) : (
              <>
                <p className="mt-6 text-sm text-ink-muted">
                  Avbokning senast 24 timmar innan. Efter avbokning blir tiden
                  ledig igen.
                </p>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={cancel}
                  className="mt-6 w-full rounded-full border border-line py-3.5 text-[11px] uppercase tracking-[0.18em] text-ink transition hover:border-red-400 hover:text-red-600 disabled:opacity-60"
                >
                  {cancelling ? "Avbokar…" : "Avboka tiden"}
                </button>
              </>
            )}
          </div>
        )}

        <Link
          href="/boka"
          className="mt-8 inline-flex rounded-full bg-ink px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-white"
        >
          Boka ny tid
        </Link>
      </div>
    </main>
  );
}
