import nodemailer from "nodemailer";
import {
  buildBookingIcs,
  type CalendarBooking,
} from "@/lib/calendar";
import { setRequestSiteUrl, manageUrl } from "@/lib/sms";
import { siteConfig } from "@/lib/site";

type MailResult = { ok: boolean; skipped?: boolean; error?: string };

export function isEmailConfigured() {
  return (
    isBrevoConfigured() || isSmtpConfigured() || isResendConfigured()
  );
}

function isBrevoConfigured() {
  return Boolean(
    process.env.BREVO_API_KEY?.trim() &&
      process.env.EMAIL_FROM_ADDRESS?.trim() &&
      process.env.SEVDA_EMAIL?.trim(),
  );
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.SEVDA_EMAIL?.trim(),
  );
}

function isResendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.EMAIL_FROM?.trim() &&
      process.env.SEVDA_EMAIL?.trim(),
  );
}

function parseFrom() {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) {
    const m = explicit.match(/^(.*?)\s*<([^>]+)>$/);
    if (m) return { name: m[1].trim() || "Beauty by Sevda", email: m[2].trim() };
    if (explicit.includes("@")) return { name: "Beauty by Sevda", email: explicit };
  }
  const addr = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (addr) {
    return {
      name: process.env.EMAIL_FROM_NAME?.trim() || "Beauty by Sevda",
      email: addr,
    };
  }
  const user = process.env.SMTP_USER?.trim();
  if (user) return { name: "Beauty by Sevda", email: user };
  return { name: "Beauty by Sevda", email: "onboarding@resend.dev" };
}

function fromAddressString() {
  const f = parseFrom();
  return `${f.name} <${f.email}>`;
}

/** Sätt bas-URL från bokningsrequest (så länkar inte blir localhost). */
export function bindEmailSiteUrl(req: {
  headers: Headers;
  nextUrl?: { protocol: string; host: string };
}) {
  const origin = req.headers.get("origin")?.trim();
  if (origin && /^https?:\/\//i.test(origin)) {
    setRequestSiteUrl(origin);
    return;
  }
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim() ||
    req.nextUrl?.host;
  if (!host) return;
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (req.nextUrl?.protocol || "http:").replace(":", "") ||
    "http";
  setRequestSiteUrl(`${proto}://${host}`);
}

async function sendViaBrevo(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  ics?: string;
  icsFilename?: string;
}): Promise<MailResult> {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) return { ok: true, skipped: true };

  const from = parseFrom();
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map(
    (email) => ({ email }),
  );

  const body: Record<string, unknown> = {
    sender: { name: from.name, email: from.email },
    to: recipients,
    subject: input.subject,
    htmlContent: input.html,
    textContent:
      input.text ||
      input.html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    // Försök stänga av Brevo-spårning (annars blir länkar långa blå sendibt2-URL:er).
    headers: {
      "X-Mailin-Track": "0",
      "X-Mailin-Track-Clicks": "0",
      "X-Mailin-Track-Opens": "0",
    },
  };

  if (input.ics) {
    body.attachment = [
      {
        name: input.icsFilename || "bokning.ics",
        content: Buffer.from(input.ics, "utf8").toString("base64"),
      },
    ];
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Brevo fel:", text);
    return { ok: false, error: text };
  }

  return { ok: true };
}

async function sendViaSmtp(input: {
  to: string | string[];
  subject: string;
  html: string;
  ics?: string;
  icsFilename?: string;
}): Promise<MailResult> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return { ok: true, skipped: true };

  const port = Number(process.env.SMTP_PORT || "587");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const to = Array.isArray(input.to) ? input.to.join(", ") : input.to;
  const attachments = input.ics
    ? [
        {
          filename: input.icsFilename || "bokning.ics",
          content: input.ics,
          contentType: "text/calendar; charset=utf-8",
        },
      ]
    : undefined;

  try {
    await transporter.sendMail({
      from: fromAddressString(),
      to,
      subject: input.subject,
      html: input.html,
      attachments,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SMTP fel:", message);
    return { ok: false, error: message };
  }
}

async function sendViaResend(input: {
  to: string | string[];
  subject: string;
  html: string;
  ics?: string;
  icsFilename?: string;
}): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || fromAddressString();
  if (!key || !from) return { ok: true, skipped: true };

  const body: Record<string, unknown> = {
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  };

  if (input.ics) {
    body.attachments = [
      {
        filename: input.icsFilename || "bokning.ics",
        content: Buffer.from(input.ics, "utf8").toString("base64"),
      },
    ];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Resend fel:", text);
    return { ok: false, error: text };
  }

  return { ok: true };
}

async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  ics?: string;
  icsFilename?: string;
}): Promise<MailResult> {
  // Brevo först — funkar utan Microsoft / utan egen domän
  if (isBrevoConfigured()) return sendViaBrevo(input);
  if (isSmtpConfigured()) return sendViaSmtp(input);
  if (isResendConfigured()) return sendViaResend(input);
  return { ok: true, skipped: true };
}

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tipLine(category?: string) {
  return category === "fransar"
    ? `<p style="margin:16px 0 0;color:#555;font-size:14px;line-height:1.5;font-family:Helvetica,Arial,sans-serif">Tips: kom med rentvättade fransar, utan smink eller olja.</p>`
    : "";
}

function formatSvDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt
    .toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/ /g, "&nbsp;");
}

/**
 * Avbokning — enkel textlänk + knapp.
 * Synlig text = "Avboka din tid — tryck här" (inte hela URL:en).
 * Outlook-vänlig tabellknapp.
 */
function cancelButton(url: string) {
  const safe = esc(url);
  return `
<div style="margin:28px 0 8px;text-align:center;">
  <p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#333;">
    Vill du avboka? Tryck här:
  </p>
  <a href="${safe}"
     target="_blank"
     rel="noopener noreferrer"
     style="font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#a0894a;text-decoration:underline;">
    Avboka din tid — tryck här
  </a>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:18px auto 0;">
  <tr>
    <td align="center" bgcolor="#111111" style="border-radius:999px;background-color:#111111;">
      <a href="${safe}"
         target="_blank"
         rel="noopener noreferrer"
         style="display:inline-block;padding:14px 32px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;color:#ffffff;background-color:#111111;border-radius:999px;">
        Avboka tid
      </a>
    </td>
  </tr>
</table>`;
}

function emailShell(inner: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f5f2;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;font-family:Helvetica,Arial,sans-serif;">
    <p style="margin:0 0 20px;text-align:center;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#a0894a;">
      Beauty by Sevda
    </p>
    <div style="background:#ffffff;border:1px solid #e8e2d8;padding:28px 24px;">
      ${inner}
    </div>
    <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#888;line-height:1.5;">
      Frågor? Instagram @${esc(siteConfig.instagramHandle)}
    </p>
  </div>
</body></html>`;
}

/** Mejl till Sevda — ny bokning (vem/när) */
export async function sendSevdaBookingEmail(b: CalendarBooking) {
  const to = process.env.SEVDA_EMAIL?.trim();
  if (!to) return { ok: true, skipped: true } as MailResult;

  const ics = buildBookingIcs(b);
  const when = formatSvDate(b.dateKey);

  return sendEmail({
    to,
    subject: `Ny bokning ${b.dateKey} kl ${b.time} — ${b.name}`,
    ics,
    text: `Ny bokning\n${b.dateKey} kl ${b.time}\n${b.serviceName} · ${b.price} kr\n${b.name}\n${b.phone}\n${b.email}`,
    html: emailShell(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:normal;color:#1a1a1a;">Ny bokning</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#555;">
        ${when} · kl ${esc(b.time)} · ca ${b.durationMinutes} min
      </p>
      <p style="margin:0 0 4px;font-size:17px;color:#1a1a1a;">${esc(b.serviceName)}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#666;">${b.price} kr</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#333;">
        <strong>Kund:</strong> ${esc(b.name)}<br/>
        <strong>Tel:</strong> ${esc(b.phone)}<br/>
        <strong>E-post:</strong> ${esc(b.email)}
      </p>
      ${b.note ? `<p style="margin:14px 0 0;font-size:14px;color:#555;">Meddelande: ${esc(b.note)}</p>` : ""}
      <p style="margin:18px 0 0;font-size:13px;color:#888;">Kalenderfil bifogad.</p>
    `),
  });
}

/** Tack till kund + avbokningsknapp (HTTPS) */
export async function sendCustomerBookingEmail(b: CalendarBooking) {
  const ics = buildBookingIcs(b);
  const first = b.name.split(" ")[0] || b.name;
  const when = formatSvDate(b.dateKey);
  const cancel = manageUrl(b.manageToken);
  const address = process.env.SEVDA_VISIT_ADDRESS?.trim();

  const addressText = address
    ? `\nAdress: ${address}\nRing pa dorren / hors av dig ca 5 minuter innan nar du ar utanfor.\n`
    : "\nAdress skickas separat om den saknas har.\n";

  const addressHtml = address
    ? `
      <div style="margin:18px 0 0;padding:16px 0;border-top:1px solid #e8e2d8;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a0894a;">Hitta hit</p>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#1a1a1a;">${esc(address)}</p>
        <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#555;">
          Hör av dig ca&nbsp;5&nbsp;minuter innan när du är utanför — så kommer jag och öppnar.
        </p>
      </div>`
    : "";

  // Ren text utan URL:er — annars visar Hotmail/Outlook långa blå tracking-länkar.
  const text = `Tack for att du bokar hos mig, ${first}!

Din tid: ${b.dateKey} kl ${b.time}
${b.serviceName}
${b.price} kr · ca ${b.durationMinutes} min
${addressText}
Betalning: kontant pa plats.

Vill du avboka? Oppna detta mejl (inte som enbart text) och tryck pa "Avboka din tid — tryck har".
Du kan ocksa skriva till @${siteConfig.instagramHandle} pa Instagram.

Vi ses snart!
— Sevda`;

  return sendEmail({
    to: b.email,
    subject: `Tack för din bokning — Beauty by Sevda`,
    ics,
    text,
    html: emailShell(`
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:normal;color:#1a1a1a;">
        Tack för att du bokar hos mig, ${esc(first)}!
      </h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#555;">
        Din tid är sparad. Jag ser fram emot att ta hand om dig.
      </p>
      <div style="border-top:1px solid #e8e2d8;border-bottom:1px solid #e8e2d8;padding:18px 0;margin-bottom:22px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a0894a;">Din tid</p>
        <p style="margin:0 0 4px;font-size:20px;color:#1a1a1a;">${when}</p>
        <p style="margin:0 0 12px;font-size:18px;color:#1a1a1a;">kl&nbsp;${esc(b.time)}</p>
        <p style="margin:0;font-size:15px;color:#333;">${esc(b.serviceName)}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#666;">${b.price}&nbsp;kr · ca ${b.durationMinutes} min</p>
      </div>
      ${addressHtml}
      ${tipLine(b.category)}
      <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#555;">
        Betalning: kontant på plats.<br/>
        Avboka senast 24&nbsp;timmar innan.
      </p>
      ${cancelButton(cancel)}
      <p style="margin:22px 0 0;font-size:13px;color:#888;">
        Kalenderfil finns bifogad i mejlet.
      </p>
      <p style="margin:26px 0 0;font-size:15px;color:#1a1a1a;">Vi ses snart!<br/><span style="color:#888;font-size:13px;">— Sevda</span></p>
    `),
  });
}

export async function sendCancelEmails(b: {
  name: string;
  email: string;
  serviceName: string;
  dateKey: string;
  time: string;
}) {
  const sevda = process.env.SEVDA_EMAIL?.trim();
  const first = b.name.split(" ")[0] || b.name;
  const when = formatSvDate(b.dateKey);

  const customer = b.email
    ? sendEmail({
        to: b.email,
        subject: `Din tid är avbokad — Beauty by Sevda`,
        text: `Hej ${first}. Din tid ${b.dateKey} kl ${b.time} (${b.serviceName}) ar avbokad. Hor av dig pa Instagram @${siteConfig.instagramHandle} om du vill boka igen.`,
        html: emailShell(`
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:normal;color:#1a1a1a;">Avbokad</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#555;">
            Hej ${esc(first)}. Din tid ${when} kl&nbsp;${esc(b.time)} (${esc(b.serviceName)}) är avbokad.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#555;">
            Vill du boka igen? Hör av dig på Instagram @${esc(siteConfig.instagramHandle)}.
          </p>
        `),
      })
    : Promise.resolve({ ok: true, skipped: true } as MailResult);

  const toSevda = sevda
    ? sendEmail({
        to: sevda,
        subject: `Avbokad ${b.dateKey} kl ${b.time} — ${b.name}`,
        text: `Avbokad: ${b.dateKey} kl ${b.time}\n${b.name} · ${b.serviceName} · ${b.email}`,
        html: emailShell(`
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:normal;color:#1a1a1a;">Avbokad</h1>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#333;">
            ${when} kl&nbsp;${esc(b.time)}<br/>
            ${esc(b.name)} · ${esc(b.serviceName)}<br/>
            ${esc(b.email)}
          </p>
          <p style="margin:14px 0 0;font-size:14px;color:#555;">
            Tiden är ledig igen.
          </p>
        `),
      })
    : Promise.resolve({ ok: true, skipped: true } as MailResult);

  const [c, s] = await Promise.all([customer, toSevda]);
  return { customer: c, sevda: s };
}
