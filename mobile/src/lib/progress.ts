/** Fraction of the current level completed, clamped to 0..1. */
export function progressRatio(xpIntoLevel: number, xpForNextLevel: number): number {
  if (!(xpForNextLevel > 0) || !Number.isFinite(xpIntoLevel)) return 0;
  return Math.min(1, Math.max(0, xpIntoLevel / xpForNextLevel));
}
