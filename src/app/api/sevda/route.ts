import { NextRequest, NextResponse } from "next/server";
import {
  BOOKING_MONTH,
  BOOKING_YEAR,
  DAY_SLOTS,
  daysInMonth,
  monthLabel,
  toDateKey,
} from "@/data/availability";
import {
  cancelBooking,
  getDaySchedule,
  listBookings,
  setSlotClosed,
  closeDateRange,
  addExtraSlot,
  removeExtraSlot,
} from "@/lib/bookings";
import { sendCancelEmails } from "@/lib/email";

function expectedPassword() {
  return process.env.SEVDA_PASSWORD?.trim() || "";
}

function authorized(req: NextRequest) {
  const expected = expectedPassword();
  if (!expected) return false;
  return req.headers.get("x-sevda-password") === expected;
}

function unauthorized() {
  return NextResponse.json({ error: "Fel lösenord." }, { status: 401 });
}

/** POST { action: "login" | "toggle-slot" | "close-range" | "cancel" | "add-slot" | "remove-slot" } */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: string;
      password?: string;
      dateKey?: string;
      time?: string;
      closed?: boolean;
      id?: string;
      fromDateKey?: string;
      toDateKey?: string;
    };

    if (body.action === "login") {
      if (body.password === expectedPassword()) {
        return NextResponse.json({ ok: true });
      }
      return unauthorized();
    }

    if (!authorized(req)) return unauthorized();

    if (body.action === "toggle-slot") {
      if (!body.dateKey || !body.time || typeof body.closed !== "boolean") {
        return NextResponse.json({ error: "Saknar dag/tid." }, { status: 400 });
      }
      await setSlotClosed(body.dateKey, body.time, body.closed);
      const schedule = await getDaySchedule(body.dateKey);
      return NextResponse.json({ ok: true, schedule });
    }

    if (body.action === "close-range") {
      if (!body.fromDateKey || !body.toDateKey) {
        return NextResponse.json(
          { error: "Saknar från-/till-datum." },
          { status: 400 },
        );
      }
      try {
        const result = await closeDateRange(body.fromDateKey, body.toDateKey);
        const schedule = body.dateKey
          ? await getDaySchedule(body.dateKey)
          : await getDaySchedule(body.fromDateKey);
        return NextResponse.json({
          ok: true,
          ...result,
          schedule,
          message: `${result.closed} tider stängda ${result.fromDateKey}–${result.toDateKey}.`,
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Kunde inte stänga." },
          { status: 400 },
        );
      }
    }

    if (body.action === "add-slot") {
      if (!body.dateKey || !body.time) {
        return NextResponse.json({ error: "Saknar dag/tid." }, { status: 400 });
      }
      try {
        const schedule = await addExtraSlot(body.dateKey, body.time);
        return NextResponse.json({
          ok: true,
          schedule,
          message: `Tillagd ${body.time} — syns nu i bokningen.`,
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Kunde inte lägga till." },
          { status: 400 },
        );
      }
    }

    if (body.action === "remove-slot") {
      if (!body.dateKey || !body.time) {
        return NextResponse.json({ error: "Saknar dag/tid." }, { status: 400 });
      }
      try {
        const schedule = await removeExtraSlot(body.dateKey, body.time);
        return NextResponse.json({ ok: true, schedule });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Kunde inte ta bort." },
          { status: 400 },
        );
      }
    }

    if (body.action === "cancel") {
      if (!body.id) {
        return NextResponse.json({ error: "Saknar bokning." }, { status: 400 });
      }
      const booking = await cancelBooking(body.id);
      if (!booking) {
        return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
      }
      await sendCancelEmails({
        name: booking.name,
        email: booking.email || "",
        serviceName: booking.serviceName,
        dateKey: booking.dateKey,
        time: booking.time,
      });
      const schedule = body.dateKey
        ? await getDaySchedule(body.dateKey)
        : await getDaySchedule(booking.dateKey);
      return NextResponse.json({
        ok: true,
        message: "Avbokad. Kund och du får mejl. Tiden är ledig.",
        schedule,
      });
    }

    return NextResponse.json({ error: "Okänd åtgärd." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500 });
  }
}

/** GET ?date=2026-09-01 — schema + kommande bokningar */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return unauthorized();

  const date =
    req.nextUrl.searchParams.get("date")?.trim() ||
    toDateKey(BOOKING_YEAR, BOOKING_MONTH, 1);

  const [schedule, all] = await Promise.all([
    getDaySchedule(date),
    listBookings(false),
  ]);

  const upcoming = all
    .slice()
    .sort((a, b) =>
      `${a.dateKey}${a.time}`.localeCompare(`${b.dateKey}${b.time}`),
    )
    .slice(0, 40)
    .map((b) => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
      email: b.email,
      serviceName: b.serviceName,
      dateKey: b.dateKey,
      time: b.time,
      price: b.price,
    }));

  const total = daysInMonth(BOOKING_YEAR, BOOKING_MONTH);
  const days = Array.from({ length: total }, (_, i) =>
    toDateKey(BOOKING_YEAR, BOOKING_MONTH, i + 1),
  );

  return NextResponse.json({
    dateKey: date,
    monthLabel,
    slots: DAY_SLOTS,
    days,
    schedule,
    upcoming,
  });
}
