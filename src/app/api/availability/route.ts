import { NextRequest, NextResponse } from "next/server";
import { getService, type ServiceCategory } from "@/data/services";
import {
  BOOKING_MONTH,
  BOOKING_YEAR,
  BUFFER_MINUTES,
  DAY_SLOTS,
  STANDARD_DURATION_MINUTES,
  daysInMonth,
  toDateKey,
} from "@/data/availability";
import {
  dayHasOpenSlot,
  getOpenTimesForDate,
  getPublicSlotsForDate,
  getStartsForDate,
} from "@/lib/bookings";

/** GET ?date=2026-09-05&serviceId=gele-nytt */
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    const serviceId = req.nextUrl.searchParams.get("serviceId");

    const service = serviceId ? getService(serviceId) : null;
    const duration = service?.durationMinutes ?? STANDARD_DURATION_MINUTES;
    const category = (service?.category ?? null) as ServiceCategory | null;

    if (date) {
      const [open, slots, allStarts] = await Promise.all([
        getOpenTimesForDate(date, duration, category),
        getPublicSlotsForDate(date, duration, category),
        getStartsForDate(date),
      ]);
      return NextResponse.json({
        dateKey: date,
        open,
        slots,
        allStarts,
        durationMinutes: duration,
        bufferMinutes: BUFFER_MINUTES,
        serviceName: service?.name ?? null,
        category,
      });
    }

    const total = daysInMonth(BOOKING_YEAR, BOOKING_MONTH);
    const days: { dateKey: string; day: number; openCount: number }[] = [];

    for (let day = 1; day <= total; day++) {
      const dateKey = toDateKey(BOOKING_YEAR, BOOKING_MONTH, day);
      const has = await dayHasOpenSlot(dateKey, duration, category);
      const open = has ? await getOpenTimesForDate(dateKey, duration, category) : [];
      days.push({ dateKey, day, openCount: open.length });
    }

    return NextResponse.json({
      year: BOOKING_YEAR,
      month: BOOKING_MONTH,
      durationMinutes: duration,
      bufferMinutes: BUFFER_MINUTES,
      allStarts: DAY_SLOTS,
      category,
      days,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kunde inte hämta tider.";
    console.error("availability:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
