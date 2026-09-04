import { NextRequest, NextResponse } from "next/server";
import { getService, type ServiceCategory } from "@/data/services";
import {
  BOOKING_MONTH,
  BOOKING_YEAR,
  BUFFER_MINUTES,
  DAY_SLOTS,
  STANDARD_DURATION_MINUTES,
} from "@/data/availability";
import {
  getMonthOpenCounts,
  getOpenTimesForDate,
  getPublicSlotsForDate,
  getStartsForDate,
} from "@/lib/bookings";

/** GET ?date=2026-09-05&serviceId=gele-nytt  |  GET ?serviceId=… (månad) */
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
        getStartsForDate(date, { includeExtras: false }),
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

    const days = await getMonthOpenCounts(duration, category);

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
