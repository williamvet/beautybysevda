import { NextRequest, NextResponse } from "next/server";
import { getService } from "@/data/services";
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
  const date = req.nextUrl.searchParams.get("date");
  const serviceId = req.nextUrl.searchParams.get("serviceId");

  const service = serviceId ? getService(serviceId) : null;
  const duration = service?.durationMinutes ?? STANDARD_DURATION_MINUTES;

  if (date) {
    const [open, slots, allStarts] = await Promise.all([
      getOpenTimesForDate(date, duration),
      getPublicSlotsForDate(date, duration),
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
    });
  }

  const total = daysInMonth(BOOKING_YEAR, BOOKING_MONTH);
  const days: { dateKey: string; day: number; openCount: number }[] = [];

  for (let day = 1; day <= total; day++) {
    const dateKey = toDateKey(BOOKING_YEAR, BOOKING_MONTH, day);
    const has = await dayHasOpenSlot(dateKey, duration);
    const open = has ? await getOpenTimesForDate(dateKey, duration) : [];
    days.push({ dateKey, day, openCount: open.length });
  }

  return NextResponse.json({
    year: BOOKING_YEAR,
    month: BOOKING_MONTH,
    durationMinutes: duration,
    bufferMinutes: BUFFER_MINUTES,
    allStarts: DAY_SLOTS,
    days,
  });
}
