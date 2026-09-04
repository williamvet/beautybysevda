export type CalendarBooking = {
  id: string;
  manageToken: string;
  name: string;
  email: string;
  phone: string;
  serviceName: string;
  dateKey: string;
  time: string;
  durationMinutes: number;
  price: number;
  note?: string;
  category?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Lokalt datum+tid → ICS (Europe/Stockholm, floating local) */
function toIcsLocal(dateKey: string, time: string, addMinutes = 0) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm + addMinutes, 0);
  return (
    `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}` +
    `T${pad(start.getHours())}${pad(start.getMinutes())}00`
  );
}

function stampUtc() {
  const n = new Date();
  return (
    `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}` +
    `T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}Z`
  );
}

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Kalenderfil — öppna i Mail/Gmail → “Lägg till i kalender” */
export function buildBookingIcs(b: CalendarBooking) {
  const dtStart = toIcsLocal(b.dateKey, b.time, 0);
  const dtEnd = toIcsLocal(b.dateKey, b.time, b.durationMinutes);
  const uid = `${b.id}@beautybysevda`;
  const summary = `Beauty by Sevda — ${b.serviceName}`;
  const desc = [
    `Kund: ${b.name}`,
    `Tel: ${b.phone}`,
    `E-post: ${b.email}`,
    `Pris: ${b.price} kr`,
    b.note ? `Meddelande: ${b.note}` : "",
    `Avboka: beautybysevda.se/hantera/${b.manageToken}`,
  ]
    .filter(Boolean)
    .join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Beauty by Sevda//Booking//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stampUtc()}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(desc)}`,
    `LOCATION:${escapeIcs("Beauty by Sevda")}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Direktlänk “Lägg till i Google Kalender” */
export function googleCalendarUrl(b: CalendarBooking) {
  const start = toIcsLocal(b.dateKey, b.time, 0);
  const end = toIcsLocal(b.dateKey, b.time, b.durationMinutes);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Beauty by Sevda — ${b.serviceName}`,
    dates: `${start}/${end}`,
    details: [
      `Kund: ${b.name}`,
      `Tel: ${b.phone}`,
      `E-post: ${b.email}`,
      `${b.price} kr`,
      `Avboka: beautybysevda.se/hantera/${b.manageToken}`,
    ].join("\n"),
    location: "Beauty by Sevda",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
