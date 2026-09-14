import { NextRequest, NextResponse } from "next/server";
import { getService, type ServiceCategory } from "@/data/services";
import {
  BOOKING_END_DATE_KEY,
  BOOKING_YEAR,
  BUFFER_MINUTES,
  DAY_SLOTS,
  STANDARD_DURATION_MINUTES,
  currentBookableMonth,
  formatMonthLabel,
} from "@/data/availability";
import {
  getMonthOpenCounts,
  getPublicSlotsForDate,
} from "@/lib/bookings";

/** GET ?date=2026-09-05&serviceId=…  |  GET ?serviceId=…&year=2026&month=9 */
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    const serviceId = req.nextUrl.searchParams.get("serviceId");

    const service = serviceId ? getService(serviceId) : null;
    const duration = service?.durationMinutes ?? STANDARD_DURATION_MINUTES;
    const category = (service?.category ?? null) as ServiceCategory | null;

    if (date) {
      const slots = await getPublicSlotsForDate(date, duration, category);
      const open = slots
        .filter((s) => s.status === "open")
        .map((s) => s.time);
      return NextResponse.json({
        dateKey: date,
        open,
        slots,
        allStarts: DAY_SLOTS,
        durationMinutes: duration,
        bufferMinutes: BUFFER_MINUTES,
        serviceName: service?.name ?? null,
        category,
        bookingEnd: BOOKING_END_DATE_KEY,
      });
    }

    const yearParam = Number(req.nextUrl.searchParams.get("year") || BOOKING_YEAR);
    const monthParam = Number(req.nextUrl.searchParams.get("month") || "");
    // month query = 1–12; internt 0–11
    const year = yearParam === BOOKING_YEAR ? BOOKING_YEAR : BOOKING_YEAR;
    const monthIndex = Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam - 1
      : currentBookableMonth();

    const days = await getMonthOpenCounts(
      duration,
      category,
      year,
      monthIndex,
    );

    return NextResponse.json({
      year,
      month: monthIndex,
      monthLabel: formatMonthLabel(year, monthIndex),
      durationMinutes: duration,
      bufferMinutes: BUFFER_MINUTES,
      allStarts: DAY_SLOTS,
      category,
      days,
      bookingEnd: BOOKING_END_DATE_KEY,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kunde inte hämta tider.";
    console.error("availability:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
