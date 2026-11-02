const DAY_MS = 24 * 60 * 60 * 1000;
export const BASE_POINTS = 10;
export const MAX_STREAK_BONUS_DAYS = 5;

function toDay(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;
}

function fromDay(day: number) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

// Distinct sorted day numbers (days since epoch) from 'YYYY-MM-DD' strings.
function uniqueDays(dates: string[]) {
  return [...new Set(dates)].map(toDay).sort((a, b) => a - b);
}

// Length of the consecutive-day run that ends on `date` (0 if `date` has no completion).
export function streakEndingOn(dates: string[], date: string): number {
  const days = new Set(uniqueDays(dates));
  let day = toDay(date);
  let length = 0;
  while (days.has(day)) {
    length += 1;
    day -= 1;
  }
  return length;
}

// Consecutive days ending today OR yesterday (grace period); 0 otherwise.
export function currentStreak(dates: string[], today: string): number {
  const todayStreak = streakEndingOn(dates, today);
  if (todayStreak > 0) return todayStreak;
  return streakEndingOn(dates, fromDay(toDay(today) - 1));
}

export function longestStreak(dates: string[]): number {
  const days = uniqueDays(dates);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

// 10 base points + 2 per previous streak day, capped at 5 bonus steps (max 20).
export function pointsForStreak(streakLength: number): number {
  return BASE_POINTS + Math.min(Math.max(streakLength - 1, 0), MAX_STREAK_BONUS_DAYS) * 2;
}

export function xpForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}

export function levelForXp(xp: number): number {
  let level = Math.max(1, Math.floor(Math.sqrt(Math.max(xp, 0) / 50)) + 1);
  // Guard against floating point error at exact boundaries.
  while (xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;
  return level;
}

export function stageForLevel(level: number): number {
  return Math.min(5, Math.ceil(level / 3));
}

export function characterStats(xp: number, dates: string[], today: string) {
  const level = levelForXp(xp);
  return {
    xp,
    level,
    xpIntoLevel: xp - xpForLevel(level),
    xpForNextLevel: xpForLevel(level + 1) - xpForLevel(level),
    stage: stageForLevel(level),
    currentStreak: currentStreak(dates, today),
    longestStreak: longestStreak(dates),
  };
}
