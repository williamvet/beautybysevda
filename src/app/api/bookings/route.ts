import { NextRequest, NextResponse } from "next/server";
import { getService } from "@/data/services";
import { DAY_SLOTS } from "@/data/availability";
import {
  addBooking,
  getOpenTimesForDate,
  getStartsForDate,
  updateBookingNotifications,
} from "@/lib/bookings";
import {
  bindEmailSiteUrl,
  isCleanCustomerMailConfigured,
  isEmailConfigured,
  sendCustomerBookingEmail,
  sendSevdaBookingEmail,
} from "@/lib/email";
import { normalizePhoneToE164, setRequestSiteUrl } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    bindEmailSiteUrl(req);
    const body = await req.json();
    const { name, phone, email, note, serviceId, dateKey, time } = body as {
      name?: string;
      phone?: string;
      email?: string;
      note?: string;
      serviceId?: string;
      dateKey?: string;
      time?: string;
    };

    if (
      !name?.trim() ||
      !phone?.trim() ||
      !email?.trim() ||
      !serviceId ||
      !dateKey ||
      !time
    ) {
      return NextResponse.json(
        { error: "Fyll i namn, telefon, e-post, tjänst, dag och tid." },
        { status: 400 },
      );
    }

    const emailNorm = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ error: "Ogiltig e-post." }, { status: 400 });
    }

    const phoneE164 = normalizePhoneToE164(phone);
    if (phoneE164.length < 10) {
      return NextResponse.json(
        { error: "Ogiltigt telefonnummer." },
        { status: 400 },
      );
    }

    if (!(DAY_SLOTS as readonly string[]).includes(time)) {
      const starts = await getStartsForDate(dateKey);
      if (!starts.includes(time)) {
        return NextResponse.json({ error: "Ogiltig tid." }, { status: 400 });
      }
    }

    const service = getService(serviceId);
    if (!service) {
      return NextResponse.json({ error: "Okänd tjänst." }, { status: 400 });
    }

    const open = await getOpenTimesForDate(
      dateKey,
      service.durationMinutes,
      service.category,
    );
    if (!open.includes(time)) {
      return NextResponse.json(
        {
          error:
            "Tiden krockar med en annan kund eller hinns inte innan 20:00. Välj en annan.",
        },
        { status: 409 },
      );
    }

    const booking = await addBooking({
      name: name.trim(),
      phone: phoneE164,
      email: emailNorm,
      note: note?.trim() || "",
      serviceId: service.id,
      serviceName: service.name,
      category: service.category,
      dateKey,
      time,
      durationMinutes: service.durationMinutes,
      price: service.price,
      notifiedSevda: false,
      notifiedCustomer: false,
    });

    const sevdaMail = await sendSevdaBookingEmail(booking);
    const customerMail = await sendCustomerBookingEmail(booking);

    const notifiedSevda = Boolean(sevdaMail.ok && !sevdaMail.skipped);
    const notifiedCustomer = Boolean(customerMail.ok && !customerMail.skipped);
    await updateBookingNotifications(booking.id, {
      notifiedSevda,
      notifiedCustomer,
    });

    const mailOn = isEmailConfigured();
    let hint =
      "Bekräftelse skickas till din e-post. Sevda får också ett mejl.";
    if (!mailOn) {
      hint =
        "Bokningen är sparad. Mejl är inte inkopplat ännu.";
    } else if (!isCleanCustomerMailConfigured()) {
      hint =
        "Bokningen är sparad och Sevda får mejl. Kundbekräftelse kräver SMTP/Resend (Brevo skapar trasiga blå länkar).";
    } else if (!customerMail.ok && sevdaMail.ok) {
      hint =
        "Sevda fick mejl. Din bekräftelse gick inte fram — använd avbokningslänken här på sidan.";
    } else if (!sevdaMail.ok || !customerMail.ok) {
      hint =
        "Bokningen är sparad, men något mejl gick inte fram. Använd avbokningslänken här vid behov.";
    }

    setRequestSiteUrl(null);

    return NextResponse.json({
      booking: {
        id: booking.id,
        manageToken: booking.manageToken,
        name: booking.name,
        serviceName: booking.serviceName,
        dateKey: booking.dateKey,
        time: booking.time,
        price: booking.price,
        durationMinutes: booking.durationMinutes,
        category: booking.category,
        email: booking.email,
      },
      notifications: {
        sevda: { ok: sevdaMail.ok, skipped: sevdaMail.skipped },
        customer: { ok: customerMail.ok, skipped: customerMail.skipped },
        configured: mailOn,
        hint,
      },
    });
  } catch (error) {
    setRequestSiteUrl(null);
    const message =
      error instanceof Error ? error.message : "Kunde inte spara bokningen.";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
