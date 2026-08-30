import {
  DAY_SLOTS,
  blockEndMinutes,
  filterOpenStarts,
  isValidStartTime,
  rangesOverlap,
  timeToMinutes,
} from "@/data/availability";
import { getService, type ServiceCategory } from "@/data/services";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type BookingStatus = "active" | "cancelled";

export type Booking = {
  id: string;
  /** Hemlig länk för att avboka — ingen admin */
  manageToken: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  note?: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  dateKey: string;
  time: string;
  durationMinutes: number;
  price: number;
  status: BookingStatus;
  notifiedSevda?: boolean;
  notifiedCustomer?: boolean;
  cancelledAt?: string;
};

type ClosedStore = string[];
type ExtraStore = string[];

type BookingRow = {
  id: string;
  manage_token: string;
  created_at: string;
  name: string;
  phone: string;
  email: string | null;
  note: string | null;
  service_id: string;
  service_name: string;
  category: string;
  date_key: string;
  time: string;
  duration_minutes: number;
  price: number;
  status: string;
  notified_sevda: boolean | null;
  notified_customer: boolean | null;
  cancelled_at: string | null;
};

function requireDb() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Bokningar kräver Supabase. Sätt SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return getSupabase();
}

function rowToBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    manageToken: r.manage_token || r.id,
    createdAt: r.created_at,
    name: r.name,
    phone: r.phone,
    email: r.email || "",
    note: r.note || undefined,
    serviceId: r.service_id,
    serviceName: r.service_name,
    category: r.category as ServiceCategory,
    dateKey: r.date_key,
    time: r.time,
    durationMinutes: r.duration_minutes || getService(r.service_id)?.durationMinutes || 90,
    price: r.price,
    status: (r.status as BookingStatus) || "active",
    notifiedSevda: r.notified_sevda ?? undefined,
    notifiedCustomer: r.notified_customer ?? undefined,
    cancelledAt: r.cancelled_at || undefined,
  };
}

function resolveDuration(b: Booking): number {
  if (b.durationMinutes) return b.durationMinutes;
  return getService(b.serviceId)?.durationMinutes ?? 90;
}

export async function listBookings(includeCancelled = false): Promise<Booking[]> {
  const sb = requireDb();
  let q = sb.from("bbs_bookings").select("*").order("created_at", { ascending: false });
  if (!includeCancelled) q = q.eq("status", "active");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as BookingRow[]).map(rowToBooking);
}

export async function addBooking(
  booking: Omit<Booking, "id" | "createdAt" | "status" | "manageToken">,
): Promise<Booking> {
  const sb = requireDb();
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

  const id = crypto.randomUUID();
  const manageToken = crypto.randomUUID().replace(/-/g, "");
  const createdAt = new Date().toISOString();

  const { data, error } = await sb
    .from("bbs_bookings")
    .insert({
      id,
      manage_token: manageToken,
      created_at: createdAt,
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
      note: booking.note || null,
      service_id: booking.serviceId,
      service_name: booking.serviceName,
      category: booking.category,
      date_key: booking.dateKey,
      time: booking.time,
      duration_minutes: booking.durationMinutes,
      price: booking.price,
      status: "active",
      notified_sevda: booking.notifiedSevda ?? false,
      notified_customer: booking.notifiedCustomer ?? false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToBooking(data as BookingRow);
}

export async function cancelBooking(id: string): Promise<Booking | null> {
  const sb = requireDb();
  const { data, error } = await sb
    .from("bbs_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToBooking(data as BookingRow) : null;
}

export async function getBookingByManageToken(
  token: string,
): Promise<Booking | null> {
  if (!token) return null;
  const sb = requireDb();
  const { data, error } = await sb
    .from("bbs_bookings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return rowToBooking(data as BookingRow);

  const byId = await sb.from("bbs_bookings").select("*").eq("id", token).maybeSingle();
  if (byId.error) throw new Error(byId.error.message);
  return byId.data ? rowToBooking(byId.data as BookingRow) : null;
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
  const sb = requireDb();
  const patch: Record<string, boolean> = {};
  if (flags.notifiedSevda !== undefined) patch.notified_sevda = flags.notifiedSevda;
  if (flags.notifiedCustomer !== undefined)
    patch.notified_customer = flags.notifiedCustomer;

  const { data, error } = await sb
    .from("bbs_bookings")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToBooking(data as BookingRow) : null;
}

export function slotKey(dateKey: string, time: string) {
  return `${dateKey}|${time}`;
}

export async function listClosedSlots(): Promise<ClosedStore> {
  const sb = requireDb();
  const { data, error } = await sb.from("bbs_closed_slots").select("slot_key");
  if (error) throw new Error(error.message);
  return (data || []).map((r: { slot_key: string }) => r.slot_key);
}

export async function setSlotClosed(
  dateKey: string,
  time: string,
  closed: boolean,
) {
  const sb = requireDb();
  const key = slotKey(dateKey, time);
  if (closed) {
    const { error } = await sb
      .from("bbs_closed_slots")
      .upsert({ slot_key: key }, { onConflict: "slot_key" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("bbs_closed_slots").delete().eq("slot_key", key);
    if (error) throw new Error(error.message);
  }
  return listClosedSlots();
}

export async function listExtraSlots(): Promise<ExtraStore> {
  const sb = requireDb();
  const { data, error } = await sb.from("bbs_extra_slots").select("slot_key");
  if (error) throw new Error(error.message);
  return (data || []).map((r: { slot_key: string }) => r.slot_key);
}

export async function getStartsForDate(dateKey: string): Promise<string[]> {
  const extra = await listExtraSlots();
  const custom = extra
    .filter((k) => k.startsWith(`${dateKey}|`))
    .map((k) => k.split("|")[1]);
  const set = new Set([...DAY_SLOTS, ...custom]);
  return [...set].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export async function addExtraSlot(dateKey: string, time: string) {
  const sb = requireDb();
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
  const { error } = await sb
    .from("bbs_extra_slots")
    .upsert({ slot_key: key }, { onConflict: "slot_key" });
  if (error) throw new Error(error.message);
  await setSlotClosed(dateKey, normalized, false);
  return getDaySchedule(dateKey);
}

export async function removeExtraSlot(dateKey: string, time: string) {
  const sb = requireDb();
  if ((DAY_SLOTS as readonly string[]).includes(time)) {
    throw new Error("Standardtider kan inte tas bort — stäng dem i stället.");
  }
  const active = await listBookings(false);
  if (active.some((b) => b.dateKey === dateKey && b.time === time)) {
    throw new Error("Tiden är bokad — avboka först.");
  }
  const key = slotKey(dateKey, time);
  const { error } = await sb.from("bbs_extra_slots").delete().eq("slot_key", key);
  if (error) throw new Error(error.message);
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
