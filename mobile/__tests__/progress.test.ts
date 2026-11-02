import { progressRatio } from '../src/lib/progress';

describe('progressRatio', () => {
  it('computes the fraction', () => {
    expect(progressRatio(25, 100)).toBe(0.25);
    expect(progressRatio(0, 100)).toBe(0);
    expect(progressRatio(100, 100)).toBe(1);
  });
  it('clamps to 0..1', () => {
    expect(progressRatio(150, 100)).toBe(1);
    expect(progressRatio(-5, 100)).toBe(0);
  });
  it('returns 0 when there is no next level', () => {
    expect(progressRatio(10, 0)).toBe(0);
    expect(progressRatio(0, 0)).toBe(0);
    expect(progressRatio(10, -3)).toBe(0);
    expect(progressRatio(NaN, 100)).toBe(0);
  });
});
