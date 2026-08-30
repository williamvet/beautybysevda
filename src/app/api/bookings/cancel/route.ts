import { NextRequest, NextResponse } from "next/server";
import {
  cancelBookingByToken,
  getBookingByManageToken,
} from "@/lib/bookings";
import { bindEmailSiteUrl, sendCancelEmails } from "@/lib/email";
import { setRequestSiteUrl } from "@/lib/sms";

/** GET ?token=… */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Saknar länk." }, { status: 400 });
  }

  const booking = await getBookingByManageToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      status: booking.status,
      name: booking.name.split(" ")[0],
      serviceName: booking.serviceName,
      dateKey: booking.dateKey,
      time: booking.time,
      price: booking.price,
    },
  });
}

/** POST { token } — avboka + mejl till kund och Sevda */
export async function POST(req: NextRequest) {
  try {
    bindEmailSiteUrl(req);
    const body = (await req.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Saknar länk." }, { status: 400 });
    }

    const existing = await getBookingByManageToken(token);
    if (!existing) {
      return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
    }

    if (existing.status === "cancelled") {
      return NextResponse.json({
        ok: true,
        already: true,
        message: "Redan avbokad.",
      });
    }

    const booking = await cancelBookingByToken(token);
    if (!booking) {
      return NextResponse.json({ error: "Kunde inte avboka." }, { status: 500 });
    }

    await sendCancelEmails({
      name: booking.name,
      email: booking.email || "",
      serviceName: booking.serviceName,
      dateKey: booking.dateKey,
      time: booking.time,
    });

    setRequestSiteUrl(null);

    return NextResponse.json({
      ok: true,
      message: "Avbokad. Tiden är ledig igen.",
    });
  } catch (error) {
    setRequestSiteUrl(null);
    console.error(error);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500 });
  }
}
