type SmsResult = { ok: boolean; skipped?: boolean; error?: string };

/** Per-request override så mejllänkar följer hur kunden öppnade sidan (inte localhost). */
let requestSiteUrl: string | null = null;

export function setRequestSiteUrl(url: string | null) {
  if (!url) {
    requestSiteUrl = null;
    return;
  }
  requestSiteUrl = url.replace(/\/$/, "");
}

/** Publik bas-URL för avbokningslänkar i mejl/kalender */
export function getSiteUrl() {
  // Alltid preferera .env (HTTPS-tunnel/domän) så mejllänkar funkar från iPhone
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (requestSiteUrl) return requestSiteUrl;

  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function manageUrl(token: string) {
  return `${getSiteUrl()}/hantera/${token}`;
}

/** True om Twilio-nycklar finns i .env.local */
export function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

/**
 * Svenska nummer → E.164 för Twilio.
 * 0701234567 / 701234567 / 46701234567 → +46701234567
 */
export function normalizePhoneToE164(raw: string): string {
  let n = raw.trim().replace(/[\s\-()]/g, "");
  if (!n) return "";
  if (n.startsWith("00")) n = `+${n.slice(2)}`;
  if (n.startsWith("+")) return n;
  if (n.startsWith("0")) return `+46${n.slice(1)}`;
  if (n.startsWith("46")) return `+${n}`;
  return `+${n}`;
}

/** Skickar SMS via Twilio om nycklar finns — annars hoppas över. */
export async function sendSms(
  to: string,
  body: string,
): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const normalized = normalizePhoneToE164(to);

  if (!normalized || !sid || !token || !from) {
    return { ok: true, skipped: true };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({
      To: normalized,
      From: from,
      Body: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Twilio SMS fel:", text);
    return { ok: false, error: text };
  }

  return { ok: true };
}

export function formatSevdaSms(input: {
  name: string;
  phone: string;
  serviceName: string;
  dateKey: string;
  time: string;
  price: number;
  manageToken: string;
}) {
  return `Ny bokning — Beauty by Sevda
${input.dateKey} kl ${input.time}
${input.name} · ${input.phone}
${input.serviceName} · ${input.price} kr`;
}

export function formatCustomerSms(input: {
  name: string;
  serviceName: string;
  dateKey: string;
  time: string;
  category?: "naglar" | "fransar";
  manageToken: string;
}) {
  const first = input.name.split(" ")[0] || input.name;
  const link = manageUrl(input.manageToken);
  const tip =
    input.category === "fransar"
      ? " Tips: kom med rentvättade fransar, utan smink/olja."
      : "";

  return `Hej ${first}! Din tid hos Beauty by Sevda är bokad: ${input.dateKey} kl ${input.time} — ${input.serviceName}.${tip} Kontant. Avboka senast 24 h: ${link}`;
}

export function formatCancelSms(input: {
  name: string;
  serviceName: string;
  dateKey: string;
  time: string;
}) {
  const first = input.name.split(" ")[0] || input.name;
  return `Hej ${first}. Din tid ${input.dateKey} kl ${input.time} (${input.serviceName}) hos Beauty by Sevda är avbokad. Hör av dig på Instagram om du vill boka ny tid.`;
}

export function formatSevdaCancelSms(input: {
  name: string;
  serviceName: string;
  dateKey: string;
  time: string;
}) {
  return `Avbokad — ${input.dateKey} kl ${input.time}
${input.name} · ${input.serviceName}
Tiden är ledig igen.`;
}
