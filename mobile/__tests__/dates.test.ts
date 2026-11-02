import {
  addDays,
  completionRate,
  daysInRange,
  getPeriodRange,
  startOfWeek,
  toDateString,
} from '../src/lib/dates';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 15, 30);

describe('dates', () => {
  it('formats local dates with zero padding', () => {
    expect(toDateString(d(2026, 1, 5))).toBe('2026-01-05');
  });

  it('daily range is the single day', () => {
    expect(getPeriodRange('daily', d(2026, 11, 2))).toEqual({
      from: '2026-11-02',
      to: '2026-11-02',
    });
  });

  it('weeks start on Monday', () => {
    // 2026-11-02 is a Monday
    expect(toDateString(startOfWeek(d(2026, 11, 2)))).toBe('2026-11-02');
    expect(getPeriodRange('weekly', d(2026, 11, 2))).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    });
    // Sunday belongs to the week that started the previous Monday
    expect(getPeriodRange('weekly', d(2026, 11, 8))).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    });
    expect(getPeriodRange('weekly', d(2026, 11, 4))).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    });
  });

  it('weekly range can cross month and year boundaries', () => {
    expect(getPeriodRange('weekly', d(2026, 12, 31))).toEqual({
      from: '2026-12-28',
      to: '2027-01-03',
    });
    expect(getPeriodRange('weekly', d(2026, 3, 1))).toEqual({
      from: '2026-02-23',
      to: '2026-03-01',
    });
  });

  it('monthly range handles month lengths and leap years', () => {
    expect(getPeriodRange('monthly', d(2026, 11, 2))).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
    expect(getPeriodRange('monthly', d(2026, 1, 31))).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(getPeriodRange('monthly', d(2026, 2, 10))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(getPeriodRange('monthly', d(2028, 2, 29))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
    expect(getPeriodRange('monthly', d(2026, 12, 15))).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });

  it('addDays crosses boundaries', () => {
    expect(toDateString(addDays(d(2026, 12, 31), 1))).toBe('2027-01-01');
    expect(toDateString(addDays(d(2026, 3, 1), -1))).toBe('2026-02-28');
  });

  it('counts days in a range inclusively', () => {
    expect(daysInRange({ from: '2026-11-02', to: '2026-11-02' })).toBe(1);
    expect(daysInRange(getPeriodRange('weekly', d(2026, 11, 4)))).toBe(7);
    expect(daysInRange(getPeriodRange('monthly', d(2028, 2, 10)))).toBe(29);
    // spans a DST change in many timezones
    expect(daysInRange({ from: '2026-03-01', to: '2026-04-05' })).toBe(36);
  });

  it('computes completion rate safely', () => {
    expect(completionRate(3, 2, 7)).toBeCloseTo(3 / 14);
    expect(completionRate(0, 0, 7)).toBe(0);
    expect(completionRate(5, 1, 1)).toBe(1);
  });
});
