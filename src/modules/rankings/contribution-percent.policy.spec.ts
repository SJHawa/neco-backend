import { distributeContributionPercents } from './contribution-percent.policy';

describe('distributeContributionPercents', () => {
  it('returns percentages that add up to one hundred', () => {
    const result = distributeContributionPercents([420, 330, 250]);

    expect(result).toEqual([42, 33, 25]);
    expect(result.reduce((sum, percent) => sum + percent, 0)).toBe(100);
  });

  it('distributes rounding remainder deterministically', () => {
    expect(distributeContributionPercents([1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('does not let failure deductions create a negative visual share', () => {
    expect(distributeContributionPercents([100, -20])).toEqual([100, 0]);
  });

  it('returns zero percentages when nobody earned a positive score', () => {
    expect(distributeContributionPercents([0, -20])).toEqual([0, 0]);
  });
});
