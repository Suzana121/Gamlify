import {
  characterStats,
  currentStreak,
  levelForXp,
  longestStreak,
  pointsForStreak,
  stageForLevel,
  streakEndingOn,
  xpForLevel,
} from '../src/lib/gamification';

describe('streaks', () => {
  const today = '2026-03-10';

  it('is 0 for no dates', () => {
    expect(currentStreak([], today)).toBe(0);
    expect(longestStreak([])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-03-08', '2026-03-09', '2026-03-10'], today)).toBe(3);
  });

  it('gives grace when only yesterday is done', () => {
    expect(currentStreak(['2026-03-08', '2026-03-09'], today)).toBe(2);
  });

  it('is 0 when last completion is older than yesterday', () => {
    expect(currentStreak(['2026-03-07', '2026-03-08'], today)).toBe(0);
  });

  it('ignores duplicates and unsorted input', () => {
    const dates = ['2026-03-10', '2026-03-09', '2026-03-09', '2026-03-10'];
    expect(currentStreak(dates, today)).toBe(2);
    expect(longestStreak(dates)).toBe(2);
  });

  it('breaks on gaps and handles month/year boundaries', () => {
    expect(currentStreak(['2026-03-01', '2026-03-09', '2026-03-10'], today)).toBe(2);
    expect(longestStreak(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-03'])).toBe(3);
    expect(longestStreak(['2024-02-28', '2024-02-29', '2024-03-01'])).toBe(3);
  });

  it('longest streak can exceed current', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-03-10'];
    expect(longestStreak(dates)).toBe(4);
    expect(currentStreak(dates, today)).toBe(1);
  });

  it('streakEndingOn is 0 for a day without completion', () => {
    expect(streakEndingOn(['2026-03-09'], '2026-03-10')).toBe(0);
    expect(streakEndingOn(['2026-03-08', '2026-03-09', '2026-03-11'], '2026-03-09')).toBe(2);
  });
});

describe('pointsForStreak', () => {
  it('is 10 on the first day and grows by 2 up to 20', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 30].map(pointsForStreak)).toEqual([
      10, 12, 14, 16, 18, 20, 20, 20,
    ]);
  });
});

describe('levels', () => {
  it('xpForLevel follows 50*(n-1)^2', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 50, 200, 450]);
  });

  it('levelForXp respects boundaries', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(199)).toBe(2);
    expect(levelForXp(200)).toBe(3);
    expect(levelForXp(449)).toBe(3);
    expect(levelForXp(450)).toBe(4);
    expect(levelForXp(50 * 99 ** 2 - 1)).toBe(99);
    expect(levelForXp(50 * 99 ** 2)).toBe(100);
    expect(levelForXp(1_000_000)).toBe(142);
  });
});

describe('stageForLevel', () => {
  it('is ceil(level/3) capped at 5', () => {
    expect([1, 3, 4, 6, 7, 12, 13, 15, 16, 100].map(stageForLevel)).toEqual([
      1, 1, 2, 2, 3, 4, 5, 5, 5, 5,
    ]);
  });
});

describe('characterStats', () => {
  it('returns zero state with no data', () => {
    expect(characterStats(0, [], '2026-03-10')).toEqual({
      xp: 0,
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 50,
      stage: 1,
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it('computes progress within a level', () => {
    expect(characterStats(260, ['2026-03-10'], '2026-03-10')).toMatchObject({
      level: 3,
      xpIntoLevel: 60,
      xpForNextLevel: 250,
      stage: 1,
      currentStreak: 1,
      longestStreak: 1,
    });
  });
});
