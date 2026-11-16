import { MissionResultJudgeStatus } from '@shared/enums';
import { calculateAttemptScore } from '../ranking-score.policy';
import {
  cloneRankingAttempt,
  rankingAttemptFixtures,
} from './ranking-attempt.fixture';

describe('ranking attempt fixtures', () => {
  it('contains representative clear, retry, failure, and error cases', () => {
    expect(Object.keys(rankingAttemptFixtures)).toEqual([
      'firstAttemptClear',
      'retryClear',
      'failedAttempt',
      'systemError',
    ]);

    expect(rankingAttemptFixtures.firstAttemptClear.judgeStatus).toBe(
      MissionResultJudgeStatus.PASSED,
    );
  });

  it('can clone a scenario without mutating the shared fixture', () => {
    const original = rankingAttemptFixtures.firstAttemptClear;
    const changed = cloneRankingAttempt(original, {
      difficulty: 'HARD',
      isFirstAttempt: false,
    });

    expect(changed).not.toBe(original);
    expect(changed.difficulty).toBe('HARD');
    expect(changed.isFirstAttempt).toBe(false);
    expect(original.difficulty).toBe('NORMAL');
    expect(original.isFirstAttempt).toBe(true);
  });

  it.each([
    ['firstAttemptClear', rankingAttemptFixtures.firstAttemptClear, 222],
    ['retryClear', rankingAttemptFixtures.retryClear, 225],
    ['failedAttempt', rankingAttemptFixtures.failedAttempt, -20],
    ['systemError', rankingAttemptFixtures.systemError, 0],
  ])('produces a stable score for %s', (_name, attempt, expectedScore) => {
    expect(calculateAttemptScore(attempt).total).toBe(expectedScore);
  });
});
