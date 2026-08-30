/** Öppettider: 10:00–20:00 */

export const DAY_START_MINUTES = 10 * 60; // 10:00
export const DAY_END_MINUTES = 20 * 60; // 20:00
/** Paus mellan kunder */
export const BUFFER_MINUTES = 15;
/**
 * Standardblock: ca 2 tim behandling + 15 min städ = 2 tim 15 min.
 * Starttider: 10:00 → 12:15 → 14:30 → 16:45 (4 st / dag, klar innan 20).
 */
export const STANDARD_DURATION_MINUTES = 120;
export const SLOT_STEP_MINUTES = STANDARD_DURATION_MINUTES + BUFFER_MINUTES; // 135

export const BOOKING_YEAR = 2026;
export const BOOKING_MONTH = 8; // September
export const monthLabel = "September 2026";
export const weekdayLabels = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Fast startschema: 10:00, 12:15, 14:30, 16:45
 * (behandling klar senast 18:45 + städ)
 */
export function allStartSlots(): string[] {
  const slots: string[] = [];
  for (
    let t = DAY_START_MINUTES;
    t + STANDARD_DURATION_MINUTES <= DAY_END_MINUTES;
    t += SLOT_STEP_MINUTES
  ) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

export const DAY_SLOTS = allStartSlots();

export function blockEndMinutes(startTime: string, durationMinutes: number) {
  return timeToMinutes(startTime) + durationMinutes + BUFFER_MINUTES;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return aStart < bEnd && bStart < aEnd;
}

export function filterOpenStarts(params: {
  durationMinutes: number;
  taken: { time: string; durationMinutes: number }[];
  closedTimes: string[];
  /** Standard + eventuella extra tider för dagen */
  starts?: string[];
}) {
  const { durationMinutes, taken, closedTimes } = params;
  const closed = new Set(closedTimes);
  const starts = params.starts ?? allStartSlots();

  return starts.filter((start) => {
    if (closed.has(start)) return false;

    const startM = timeToMinutes(start);
    if (startM < DAY_START_MINUTES) return false;
    if (startM + durationMinutes > DAY_END_MINUTES) return false;

    const endM = startM + durationMinutes + BUFFER_MINUTES;

    for (const b of taken) {
      const bStart = timeToMinutes(b.time);
      const bEnd = blockEndMinutes(b.time, b.durationMinutes);
      if (rangesOverlap(startM, endM, bStart, bEnd)) return false;
    }
    return true;
  });
}

/** HH:MM — giltig starttid inom öppettider */
export function isValidStartTime(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const m = timeToMinutes(time);
  if (Number.isNaN(m) || m < DAY_START_MINUTES) return false;
  // Måste hinna 2 h behandling innan 20:00
  if (m + STANDARD_DURATION_MINUTES > DAY_END_MINUTES) return false;
  const mins = Number(time.split(":")[1]);
  return mins >= 0 && mins <= 59;
}

export function formatDurationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} tim` : `${h} tim ${m} min`;
}
