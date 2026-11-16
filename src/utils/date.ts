const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Today's date in the LOCAL timezone ("YYYY-MM-DD").
 * Never use `toISOString()` here: it converts to UTC and, in the evening in
 * negative-offset timezones (e.g. UTC-3), it would return the next day.
 */
export function getLocalTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Current month as "YYYY-MM", in the local timezone. */
export function getCurrentMonthKey(): string {
  const now = new Date();
  return toMonthKey(now.getFullYear(), now.getMonth() + 1);
}

/** month: 1-12 */
export function toMonthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [y, m] = monthKey.split('-');
  return { year: Number(y), month: Number(m) };
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const zeroBased = year * 12 + (month - 1) + delta;
  return toMonthKey(Math.floor(zeroBased / 12), (zeroBased % 12) + 1);
}

/** Number of days in the month (28/29/30/31). */
export function daysInMonth(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey);
  // Day 0 of the next month = last day of this month (local constructor, no UTC).
  return new Date(year, month, 0).getDate();
}

/** "2026-11-05" -> "2026-11" (string comparison, no Date involved). */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function dayOf(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const shortMonthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });

/** Builds a Date from local parts (never parses an ISO string, which would be UTC). */
function localDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** "2026-11-05" -> "Nov 05, 2026" (unambiguous in any English locale). */
export function formatDate(isoDate: string): string {
  return dateFmt.format(localDate(isoDate));
}

/** "2026-11" -> "November 2026" */
export function formatMonthLabel(monthKey: string): string {
  return monthFmt.format(localDate(`${monthKey}-01`));
}

/** (monthKey, day) -> "Nov 5" */
export function formatDayLabel(monthKey: string, day: number): string {
  return `${shortMonthFmt.format(localDate(`${monthKey}-01`))} ${day}`;
}

/**
 * Default date for a new entry in the selected month: today if it is the
 * current month; otherwise, the 1st of that month.
 */
export function defaultDateForMonth(monthKey: string): string {
  const today = getLocalTodayISO();
  return monthKeyOf(today) === monthKey ? today : `${monthKey}-01`;
}
