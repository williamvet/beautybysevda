import { promises as fs } from "fs";
import path from "path";
import {
  DAY_SLOTS,
  blockEndMinutes,
  filterOpenStarts,
  isValidStartTime,
  rangesOverlap,
  timeToMinutes,
} from "@/data/availability";
import { getService, type ServiceCategory } from "@/data/services";

export type BookingStatus = "active" | "cancelled";

export type Booking = {
  id: string;
  /** Hemlig länk för att avboka via telefon/SMS — ingen admin */
  manageToken: string;
  createdAt: string;
  name: string;
  phone: string;
  /** Kundens e-post — bekräftelse + kalender */
  email: string;
  note?: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  dateKey: string;
  time: string;
  /** Sparad längd så overlap funkar även om menyn ändras senare */
  durationMinutes: number;
  price: number;
  status: BookingStatus;
  notifiedSevda?: boolean;
  notifiedCustomer?: boolean;
  cancelledAt?: string;
};

type ClosedStore = string[];
/** Extra starttider Sevda lagt till: "2026-09-05|11:00" */
type ExtraStore = string[];

const dataDir = path.join(process.cwd(), "data");
const bookingsPath = path.join(dataDir, "bookings.json");
const closedPath = path.join(dataDir, "closed-slots.json");
const extraPath = path.join(dataDir, "extra-slots.json");

async function ensureFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  for (const [file, empty] of [
    [bookingsPath, "[]"],
    [closedPath, "[]"],
    [extraPath, "[]"],
  ] as const) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, empty, "utf8");
    }
  }
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureFiles();
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureFiles();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

function resolveDuration(b: Booking): number {
  if (b.durationMinutes) return b.durationMinutes;
  return getService(b.serviceId)?.durationMinutes ?? 90;
}

export async function listBookings(includeCancelled = false): Promise<Booking[]> {
  const list = await readJson<Booking[]>(bookingsPath, []);
  const normalized = list.map((b) => ({
    ...b,
    status: b.status ?? ("active" as BookingStatus),
    durationMinutes: resolveDuration(b as Booking),
    manageToken:
      b.manageToken ||
      // äldre poster utan token — id fungerar som fallback i getBookingByManageToken
      b.id,
    email: b.email || "",
  }));
  if (!includeCancelled) {
    return normalized.filter((b) => b.status === "active");
  }
  return normalized;
}

export async function addBooking(
  booking: Omit<Booking, "id" | "createdAt" | "status" | "manageToken">,
): Promise<Booking> {
  const list = await readJson<Booking[]>(bookingsPath, []);
  const active = (await listBookings(false)).filter(
    (b) => b.dateKey === booking.dateKey,
  );

  const closed = await listClosedSlots();
  if (closed.includes(slotKey(booking.dateKey, booking.time))) {
    throw new Error("Tiden är stängd.");
  }

  const starts = await getStartsForDate(booking.dateKey);
  const open = filterOpenStarts({
    durationMinutes: booking.durationMinutes,
    taken: active.map((b) => ({
      time: b.time,
      durationMinutes: resolveDuration(b),
    })),
    closedTimes: closed
      .filter((k) => k.startsWith(`${booking.dateKey}|`))
      .map((k) => k.split("|")[1]),
    starts,
  });

  if (!open.includes(booking.time)) {
    throw new Error(
      "Tiden krockar med en annan kund eller hinns inte innan stängning.",
    );
  }

  const full: Booking = {
    ...booking,
    id: crypto.randomUUID(),
    manageToken: crypto.randomUUID().replace(/-/g, ""),
    createdAt: new Date().toISOString(),
    status: "active",
  };
  list.unshift(full);
  await writeJson(bookingsPath, list);
  return full;
}

export async function cancelBooking(id: string): Promise<Booking | null> {
  const list = await readJson<Booking[]>(bookingsPath, []);
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  list[idx] = {
    ...list[idx],
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  };
  await writeJson(bookingsPath, list);
  return list[idx];
}

export async function getBookingByManageToken(
  token: string,
): Promise<Booking | null> {
  if (!token) return null;
  const list = await listBookings(true);
  return (
    list.find((b) => b.manageToken === token) ??
    // bakåtkompatibelt om gammal bokning saknar token
    list.find((b) => b.id === token) ??
    null
  );
}

export async function cancelBookingByToken(
  token: string,
): Promise<Booking | null> {
  const booking = await getBookingByManageToken(token);
  if (!booking) return null;
  if (booking.status === "cancelled") return booking;
  return cancelBooking(booking.id);
}

export async function updateBookingNotifications(
  id: string,
  flags: { notifiedSevda?: boolean; notifiedCustomer?: boolean },
): Promise<Booking | null> {
  const list = await readJson<Booking[]>(bookingsPath, []);
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...flags };
  await writeJson(bookingsPath, list);
  return list[idx];
}

export function slotKey(dateKey: string, time: string) {
  return `${dateKey}|${time}`;
}

export async function listClosedSlots(): Promise<ClosedStore> {
  return readJson<ClosedStore>(closedPath, []);
}

export async function setSlotClosed(
  dateKey: string,
  time: string,
  closed: boolean,
) {
  const key = slotKey(dateKey, time);
  let list = await listClosedSlots();
  if (closed) {
    if (!list.includes(key)) list.push(key);
  } else {
    list = list.filter((k) => k !== key);
  }
  await writeJson(closedPath, list);
  return list;
}

export async function listExtraSlots(): Promise<ExtraStore> {
  return readJson<ExtraStore>(extraPath, []);
}

/** Standard + Sevdas tillagda tider för en dag, sorterade */
export async function getStartsForDate(dateKey: string): Promise<string[]> {
  const extra = await listExtraSlots();
  const custom = extra
    .filter((k) => k.startsWith(`${dateKey}|`))
    .map((k) => k.split("|")[1]);
  const set = new Set([...DAY_SLOTS, ...custom]);
  return [...set].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export async function addExtraSlot(dateKey: string, time: string) {
  const normalized = time.trim();
  if (!isValidStartTime(normalized)) {
    throw new Error(
      "Ogiltig tid. Använd t.ex. 11:00 — mellan 10:00 och 18:00.",
    );
  }
  const starts = await getStartsForDate(dateKey);
  if (starts.includes(normalized)) {
    throw new Error("Tiden finns redan den dagen.");
  }
  const key = slotKey(dateKey, normalized);
  const list = await listExtraSlots();
  list.push(key);
  await writeJson(extraPath, list);
  // Om den var stängd tidigare — öppna den
  await setSlotClosed(dateKey, normalized, false);
  return getDaySchedule(dateKey);
}

export async function removeExtraSlot(dateKey: string, time: string) {
  if ((DAY_SLOTS as readonly string[]).includes(time)) {
    throw new Error("Standardtider kan inte tas bort — stäng dem i stället.");
  }
  const active = await listBookings(false);
  if (active.some((b) => b.dateKey === dateKey && b.time === time)) {
    throw new Error("Tiden är bokad — avboka först.");
  }
  const key = slotKey(dateKey, time);
  const list = (await listExtraSlots()).filter((k) => k !== key);
  await writeJson(extraPath, list);
  await setSlotClosed(dateKey, time, false);
  return getDaySchedule(dateKey);
}

export async function getOpenTimesForDate(
  dateKey: string,
  durationMinutes: number,
): Promise<string[]> {
  const [active, closed, starts] = await Promise.all([
    listBookings(false),
    listClosedSlots(),
    getStartsForDate(dateKey),
  ]);
  const dayBookings = active.filter((b) => b.dateKey === dateKey);
  const closedTimes = closed
    .filter((k) => k.startsWith(`${dateKey}|`))
    .map((k) => k.split("|")[1]);

  return filterOpenStarts({
    durationMinutes,
    taken: dayBookings.map((b) => ({
      time: b.time,
      durationMinutes: resolveDuration(b),
    })),
    closedTimes,
    starts,
  });
}

export type PublicSlotStatus = "open" | "booked" | "closed";

/** Alla starttider med status — för röd/vit i bokningsvyn */
export async function getPublicSlotsForDate(
  dateKey: string,
  durationMinutes: number,
): Promise<{ time: string; status: PublicSlotStatus }[]> {
  const [active, closed, open, starts] = await Promise.all([
    listBookings(false),
    listClosedSlots(),
    getOpenTimesForDate(dateKey, durationMinutes),
    getStartsForDate(dateKey),
  ]);
  const openSet = new Set(open);
  const dayBookings = active.filter((b) => b.dateKey === dateKey);
  const closedSet = new Set(
    closed.filter((k) => k.startsWith(`${dateKey}|`)).map((k) => k.split("|")[1]),
  );

  return starts.map((time) => {
    if (openSet.has(time)) return { time, status: "open" as const };
    if (closedSet.has(time)) return { time, status: "closed" as const };
    const occupied = dayBookings.some((b) => {
      const start = timeToMinutes(b.time);
      const end = blockEndMinutes(b.time, resolveDuration(b));
      const t = timeToMinutes(time);
      return t >= start && t < end;
    });
    if (occupied) return { time, status: "booked" as const };
    return { time, status: "closed" as const };
  });
}

/** Om någon dag har minst en ledig start för denna behandling */
export async function dayHasOpenSlot(
  dateKey: string,
  durationMinutes: number,
) {
  const open = await getOpenTimesForDate(dateKey, durationMinutes);
  return open.length > 0;
}

export async function getDaySchedule(dateKey: string) {
  const [active, closed, starts, extra] = await Promise.all([
    listBookings(false),
    listClosedSlots(),
    getStartsForDate(dateKey),
    listExtraSlots(),
  ]);
  const dayBookings = active.filter((b) => b.dateKey === dateKey);
  const customSet = new Set(
    extra.filter((k) => k.startsWith(`${dateKey}|`)).map((k) => k.split("|")[1]),
  );

  return starts.map((time) => {
    const booking =
      dayBookings.find((b) => {
        const start = timeToMinutes(b.time);
        const end = blockEndMinutes(b.time, resolveDuration(b));
        const t = timeToMinutes(time);
        return t >= start && t < end;
      }) ?? null;

    const isClosed = closed.includes(slotKey(dateKey, time));
    const isStart = booking?.time === time;
    const isCustom = customSet.has(time);

    return {
      time,
      custom: isCustom,
      status: booking
        ? isStart
          ? ("booked" as const)
          : ("blocked" as const)
        : isClosed
          ? ("closed" as const)
          : ("open" as const),
      booking: isStart ? booking : null,
      label: booking
        ? isStart
          ? `${booking.name} · ${booking.serviceName} (${resolveDuration(booking)} min)`
          : `Upptagen (pågår)`
        : isClosed
          ? "Stängd"
          : isCustom
            ? "Ledig (egen tid)"
            : "Ledig",
    };
  });
}

export function bookingOccupies(
  a: { time: string; durationMinutes: number },
  b: { time: string; durationMinutes: number },
) {
  const aStart = timeToMinutes(a.time);
  const aEnd = blockEndMinutes(a.time, a.durationMinutes);
  const bStart = timeToMinutes(b.time);
  const bEnd = blockEndMinutes(b.time, b.durationMinutes);
  return rangesOverlap(aStart, aEnd, bStart, bEnd);
}
