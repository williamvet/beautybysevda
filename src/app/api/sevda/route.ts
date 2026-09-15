import { NextRequest, NextResponse } from "next/server";
import {
  BOOKING_END_DATE_KEY,
  BOOKING_YEAR,
  DAY_SLOTS,
  currentBookableMonth,
  daysInMonth,
  formatMonthLabel,
  toDateKey,
  todayDateKeyStockholm,
} from "@/data/availability";
import {
  archivePastActiveBookings,
  addBooking,
  cancelBooking,
  getDaySchedule,
  getOpenTimesForDate,
  listUpcomingBookings,
  setSlotClosed,
  closeDateRange,
  openDateRange,
  addExtraSlot,
  removeExtraSlot,
} from "@/lib/bookings";
import {
  bindEmailSiteUrl,
  sendCancelEmails,
  sendCustomerBookingEmail,
  sendSevdaBookingEmail,
} from "@/lib/email";
import { getService, services } from "@/data/services";
import { normalizePhoneToE164 } from "@/lib/sms";

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
      category?: "naglar" | "fransar";
      name?: string;
      phone?: string;
      email?: string;
      note?: string;
      serviceId?: string;
      sendEmails?: boolean;
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
      const category =
        body.category === "naglar" || body.category === "fransar"
          ? body.category
          : "fransar";
      try {
        const result = await closeDateRange(
          body.fromDateKey,
          body.toDateKey,
          category,
        );
        const schedule = body.dateKey
          ? await getDaySchedule(body.dateKey)
          : await getDaySchedule(body.fromDateKey);
        return NextResponse.json({
          ok: true,
          ...result,
          schedule,
          message: `${result.closed} ${category}-tider stängda ${result.fromDateKey}–${result.toDateKey}.`,
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Kunde inte stänga." },
          { status: 400 },
        );
      }
    }

    if (body.action === "open-range") {
      if (!body.fromDateKey || !body.toDateKey) {
        return NextResponse.json(
          { error: "Saknar från-/till-datum." },
          { status: 400 },
        );
      }
      const category =
        body.category === "naglar" || body.category === "fransar"
          ? body.category
          : null;
      if (!category) {
        return NextResponse.json({ error: "Saknar kategori." }, { status: 400 });
      }
      try {
        const result = await openDateRange(
          body.fromDateKey,
          body.toDateKey,
          category,
        );
        const schedule = body.dateKey
          ? await getDaySchedule(body.dateKey)
          : await getDaySchedule(body.fromDateKey);
        return NextResponse.json({
          ok: true,
          ...result,
          schedule,
          message: `${category} öppnade ${result.fromDateKey}–${result.toDateKey}. Bokningar orörda.`,
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Kunde inte öppna." },
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

    if (body.action === "book-manual") {
      if (
        !body.dateKey ||
        !body.time ||
        !body.name?.trim() ||
        !body.phone?.trim() ||
        !body.email?.trim() ||
        !body.serviceId
      ) {
        return NextResponse.json(
          { error: "Fyll i namn, telefon, e-post, tjänst, dag och tid." },
          { status: 400 },
        );
      }
      const service = getService(body.serviceId);
      if (!service) {
        return NextResponse.json({ error: "Okänd tjänst." }, { status: 400 });
      }
      const phoneE164 = normalizePhoneToE164(body.phone);
      if (phoneE164.length < 10) {
        return NextResponse.json(
          { error: "Ogiltigt telefonnummer." },
          { status: 400 },
        );
      }
      const emailNorm = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return NextResponse.json({ error: "Ogiltig e-post." }, { status: 400 });
      }

      const open = await getOpenTimesForDate(
        body.dateKey,
        service.durationMinutes,
        service.category,
      );
      if (!open.includes(body.time)) {
        return NextResponse.json(
          {
            error:
              "Tiden är inte ledig (krockar, stängd eller passerad). Öppna/lägg till tiden först.",
          },
          { status: 409 },
        );
      }

      try {
        const booking = await addBooking({
          name: body.name.trim(),
          phone: phoneE164,
          email: emailNorm,
          note: body.note?.trim() || "Inbokad av Sevda (SMS/Messenger)",
          serviceId: service.id,
          serviceName: service.name,
          category: service.category,
          dateKey: body.dateKey,
          time: body.time,
          durationMinutes: service.durationMinutes,
          price: service.price,
          notifiedSevda: false,
          notifiedCustomer: false,
        });

        let mailHint = "Bokning sparad.";
        if (body.sendEmails !== false) {
          bindEmailSiteUrl(req);
          const [sevdaMail, customerMail] = await Promise.all([
            sendSevdaBookingEmail(booking),
            sendCustomerBookingEmail(booking),
          ]);
          mailHint =
            customerMail.ok && sevdaMail.ok
              ? "Bokad. Kund och du får mejl."
              : customerMail.ok
                ? "Bokad. Kund fick mejl (ditt mejl misslyckades)."
                : sevdaMail.ok
                  ? "Bokad. Du fick mejl (kundmejlet misslyckades)."
                  : "Bokad, men mejl gick inte fram.";
        }

        const schedule = await getDaySchedule(body.dateKey);
        const upcoming = await listUpcomingBookings(80);
        return NextResponse.json({
          ok: true,
          message: mailHint,
          schedule,
          upcoming,
          booking: {
            id: booking.id,
            name: booking.name,
            dateKey: booking.dateKey,
            time: booking.time,
            serviceName: booking.serviceName,
          },
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Kunde inte boka." },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ error: "Okänd åtgärd." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500 });
  }
}

/** GET ?date=2026-09-14 — schema + kommande bokningar (hela året) */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return unauthorized();

  // Rensa passerade aktiva bokningar från listan (ingen mejl).
  try {
    await archivePastActiveBookings();
  } catch (e) {
    console.error("archivePastActiveBookings:", e);
  }

  const today = todayDateKeyStockholm();
  const monthParam = Number(req.nextUrl.searchParams.get("month") || "");
  const requestedDate = req.nextUrl.searchParams.get("date")?.trim();

  let monthIndex =
    Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam - 1
      : requestedDate
        ? Number(requestedDate.slice(5, 7)) - 1
        : currentBookableMonth();

  if (monthIndex < 0 || monthIndex > 11) monthIndex = currentBookableMonth();

  const total = daysInMonth(BOOKING_YEAR, monthIndex);
  const days = Array.from({ length: total }, (_, i) =>
    toDateKey(BOOKING_YEAR, monthIndex, i + 1),
  ).filter((d) => d >= today && d <= BOOKING_END_DATE_KEY);

  let date = requestedDate || today;
  if (!days.includes(date)) {
    date = days[0] || today;
  }

  const [schedule, upcoming] = await Promise.all([
    getDaySchedule(date),
    listUpcomingBookings(80),
  ]);

  return NextResponse.json({
    dateKey: date,
    month: monthIndex,
    monthLabel: formatMonthLabel(BOOKING_YEAR, monthIndex),
    bookingEnd: BOOKING_END_DATE_KEY,
    slots: DAY_SLOTS,
    days,
    schedule,
    upcoming,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      price: s.price,
      durationMinutes: s.durationMinutes,
    })),
  });
}
