import { MissionResultJudgeStatus } from '@shared/enums';
import { RankingAttempt } from '../ranking-score.policy';

const startedAt = new Date('2026-11-04T09:00:00.000Z');

export const rankingAttemptFixtures = {
  firstAttemptClear: {
    difficulty: 'NORMAL',
    judgeStatus: MissionResultJudgeStatus.PASSED,
    startedAt,
    deadlineAt: new Date('2026-11-04T09:01:00.000Z'),
    endedAt: new Date('2026-11-04T09:00:24.000Z'),
    isFirstAttempt: true,
  },
  retryClear: {
    difficulty: 'HARD',
    judgeStatus: MissionResultJudgeStatus.PASSED,
    startedAt,
    deadlineAt: new Date('2026-11-04T09:02:00.000Z'),
    endedAt: new Date('2026-11-04T09:01:10.000Z'),
    isFirstAttempt: false,
  },
  failedAttempt: {
    difficulty: 'EASY',
    judgeStatus: MissionResultJudgeStatus.FAILED,
    startedAt,
    deadlineAt: new Date('2026-11-04T09:01:00.000Z'),
    endedAt: new Date('2026-11-04T09:00:48.000Z'),
    isFirstAttempt: false,
  },
  systemError: {
    difficulty: 'HARD',
    judgeStatus: MissionResultJudgeStatus.ERROR,
    startedAt,
    deadlineAt: new Date('2026-11-04T09:01:00.000Z'),
    endedAt: null,
    isFirstAttempt: true,
  },
} satisfies Record<string, RankingAttempt>;

export function cloneRankingAttempt(
  fixture: RankingAttempt,
  overrides: Partial<RankingAttempt> = {},
): RankingAttempt {
  return {
    ...fixture,
    ...overrides,
    startedAt: new Date(fixture.startedAt),
    deadlineAt: new Date(fixture.deadlineAt),
    endedAt: fixture.endedAt ? new Date(fixture.endedAt) : null,
  };
}
