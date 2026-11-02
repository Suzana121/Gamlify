// Pure local-date helpers. Dates are 'YYYY-MM-DD' strings in the device's local timezone.

export type Period = 'daily' | 'weekly' | 'monthly';
export type DateRange = { from: string; to: string };

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Monday of the week containing d (weeks start on Monday). */
export function startOfWeek(d: Date): Date {
  const sinceMonday = (d.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  return addDays(d, -sinceMonday);
}

export function getPeriodRange(period: Period, now: Date): DateRange {
  if (period === 'daily') {
    const day = toDateString(now);
    return { from: day, to: day };
  }
  if (period === 'weekly') {
    const start = startOfWeek(now);
    return { from: toDateString(start), to: toDateString(addDays(start, 6)) };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateString(first), to: toDateString(last) };
}

/** Number of days in an inclusive range. */
export function daysInRange({ from, to }: DateRange): number {
  const ms = parseDateString(to).getTime() - parseDateString(from).getTime();
  return Math.round(ms / 86_400_000) + 1; // rounding absorbs DST hour shifts
}

/** Completion rate in [0, 1]: completions / (habits * days). 0 when there is nothing to complete. */
export function completionRate(completions: number, habitCount: number, days: number): number {
  const possible = habitCount * days;
  if (possible <= 0) return 0;
  return Math.min(1, completions / possible);
}
