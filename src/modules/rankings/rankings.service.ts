import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GameMode, GameRoomStatus, MissionResultJudgeStatus } from '@shared/enums';
import { GameRoomEntity } from '@modules/game-rooms/entity/game-room.entity';
import {
  calculateAttemptScore,
  calculateTeamCompletionBonus,
  type RankingScoreBreakdown,
} from './ranking-score.policy';
import type {
  GameContributionSummary,
  IndividualRankingEntry,
  TeamRankingEntry,
  TeamRankingRegistrationResponse,
} from './rankings.types';
import { distributeContributionPercents } from './contribution-percent.policy';

interface RankingAttemptRow {
  gameRoomId: string;
  turnId: string;
  playerUserId: string;
  nickname: string;
  difficulty: string;
  maxStrikeCount: number;
  strikeCount: number;
  startedAt: Date;
  deadlineAt: Date;
  endedAt: Date | null;
  judgeStatus: MissionResultJudgeStatus;
  stepId: string | null;
  missionFinished: boolean | null;
  teamName: string | null;
}

interface MutableIndividualRanking {
  userId: string;
  nickname: string;
  score: number;
  clearedSteps: number;
  failedAttempts: number;
  firstAttemptClears: number;
  clearDurationSeconds: number;
  scoreBreakdown: Omit<RankingScoreBreakdown, 'total'>;
}

interface MutableTeamRanking {
  gameRoomId: string;
  difficulty: string;
  maxStrikeCount: number;
  strikeCount: number;
  score: number;
  missionCleared: boolean;
  participants: Map<string, string>;
  teamName: string | null;
}

@Injectable()
export class RankingsService {
  constructor(private readonly dataSource: DataSource) {}

  async listIndividualRankings(limit: number): Promise<IndividualRankingEntry[]> {
    const attempts = await this.loadRankingAttempts(undefined, false);
    return this.buildIndividualRankings(attempts).slice(0, limit);
  }

  async getGameContributions(
    gameRoomId: string,
    userId: string,
  ): Promise<GameContributionSummary> {
    const room = await this.requireAccessibleFinishedMultiplayerRoom(gameRoomId, userId);
    const attempts = await this.loadRankingAttempts(gameRoomId, false);
    const individualRankings = this.buildIndividualRankings(attempts);
    const positiveScoreTotal = individualRankings.reduce(
      (total, entry) => total + Math.max(0, entry.score),
      0,
    );
    const contributionPercents = distributeContributionPercents(
      individualRankings.map((entry) => Math.max(0, entry.score)),
    );
    const teamRanking = this.buildTeamRankings(attempts)[0];

    return {
      gameRoomId,
      teamScore: teamRanking?.score ?? 0,
      teamName: room.rankingTeamName,
      rankingRegistered: room.rankingRegisteredAt !== null,
      canRegisterRanking:
        room.ownerUserId === userId && room.rankingRegisteredAt === null,
      contributions: individualRankings.map((entry, index) => ({
        ...entry,
        contributionPercent:
          positiveScoreTotal === 0 ? 0 : contributionPercents[index],
      })),
    };
  }

  async registerTeamRanking(
    gameRoomId: string,
    userId: string,
    teamName: string,
  ): Promise<TeamRankingRegistrationResponse> {
    const normalizedTeamName = teamName.trim();

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(GameRoomEntity);
      const room = await repository.findOne({
        where: { id: gameRoomId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!room) {
        throw new NotFoundException({
          code: 'GAME_ROOM_NOT_FOUND',
          message: 'Game room was not found.',
        });
      }
      if (room.ownerUserId !== userId) {
        throw new ForbiddenException({
          code: 'RANKING_OWNER_REQUIRED',
          message: 'Only the room owner can register the team ranking.',
        });
      }
      if (room.mode !== GameMode.MULTIPLAYER || room.status !== GameRoomStatus.FINISHED) {
        throw new ConflictException({
          code: 'RANKING_GAME_NOT_ELIGIBLE',
          message: 'Only finished multiplayer games can be registered.',
        });
      }
      if (room.rankingRegisteredAt) {
        throw new ConflictException({
          code: 'RANKING_ALREADY_REGISTERED',
          message: 'This game is already registered in the team ranking.',
        });
      }

      const registeredAt = new Date();
      room.rankingTeamName = normalizedTeamName;
      room.rankingRegisteredBy = userId;
      room.rankingRegisteredAt = registeredAt;
      await repository.save(room);

      return {
        gameRoomId,
        teamName: normalizedTeamName,
        registeredAt: registeredAt.toISOString(),
      };
    });
  }

  private buildIndividualRankings(
    attempts: RankingAttemptRow[],
  ): IndividualRankingEntry[] {
    const attemptCounts = new Map<string, number>();
    const rankings = new Map<string, MutableIndividualRanking>();

    for (const attempt of attempts) {
      const stepKey = `${attempt.gameRoomId}:${attempt.stepId ?? attempt.turnId}`;
      const attemptNumber = (attemptCounts.get(stepKey) ?? 0) + 1;
      if (attempt.judgeStatus !== MissionResultJudgeStatus.ERROR) {
        attemptCounts.set(stepKey, attemptNumber);
      }
      const isPassed = attempt.judgeStatus === MissionResultJudgeStatus.PASSED;
      const score = calculateAttemptScore({
        difficulty: attempt.difficulty,
        judgeStatus: attempt.judgeStatus,
        startedAt: new Date(attempt.startedAt),
        deadlineAt: new Date(attempt.deadlineAt),
        endedAt: attempt.endedAt ? new Date(attempt.endedAt) : null,
        isFirstAttempt: isPassed && attemptNumber === 1,
      });
      const ranking = rankings.get(attempt.playerUserId) ??
        createIndividualRanking(attempt.playerUserId, attempt.nickname);

      ranking.score += score.total;
      ranking.clearedSteps += isPassed ? 1 : 0;
      ranking.failedAttempts +=
        attempt.judgeStatus === MissionResultJudgeStatus.FAILED ? 1 : 0;
      ranking.firstAttemptClears += isPassed && attemptNumber === 1 ? 1 : 0;
      ranking.clearDurationSeconds += isPassed
        ? elapsedSeconds(attempt.startedAt, attempt.endedAt)
        : 0;
      ranking.scoreBreakdown.clear += score.clear;
      ranking.scoreBreakdown.firstAttempt += score.firstAttempt;
      ranking.scoreBreakdown.time += score.time;
      ranking.scoreBreakdown.failure += score.failure;
      rankings.set(attempt.playerUserId, ranking);
    }

    return [...rankings.values()]
      .sort(compareIndividualRankings)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        nickname: entry.nickname,
        score: Math.max(0, entry.score),
        clearedSteps: entry.clearedSteps,
        failedAttempts: entry.failedAttempts,
        firstAttemptClears: entry.firstAttemptClears,
        averageClearSeconds:
          entry.clearedSteps === 0
            ? null
            : Math.round(entry.clearDurationSeconds / entry.clearedSteps),
        scoreBreakdown: entry.scoreBreakdown,
      }));
  }

  async listTeamRankings(limit: number): Promise<TeamRankingEntry[]> {
    const attempts = await this.loadRankingAttempts();
    return this.buildTeamRankings(attempts).slice(0, limit);
  }

  private buildTeamRankings(attempts: RankingAttemptRow[]): TeamRankingEntry[] {
    const attemptCounts = new Map<string, number>();
    const rankings = new Map<string, MutableTeamRanking>();

    for (const attempt of attempts) {
      const stepKey = `${attempt.gameRoomId}:${attempt.stepId ?? attempt.turnId}`;
      const attemptNumber = (attemptCounts.get(stepKey) ?? 0) + 1;
      if (attempt.judgeStatus !== MissionResultJudgeStatus.ERROR) {
        attemptCounts.set(stepKey, attemptNumber);
      }
      const isPassed = attempt.judgeStatus === MissionResultJudgeStatus.PASSED;
      const score = calculateAttemptScore({
        difficulty: attempt.difficulty,
        judgeStatus: attempt.judgeStatus,
        startedAt: new Date(attempt.startedAt),
        deadlineAt: new Date(attempt.deadlineAt),
        endedAt: attempt.endedAt ? new Date(attempt.endedAt) : null,
        isFirstAttempt: isPassed && attemptNumber === 1,
      });
      const ranking = rankings.get(attempt.gameRoomId) ?? createTeamRanking(attempt);

      ranking.score += score.total;
      ranking.missionCleared ||= Boolean(attempt.missionFinished && isPassed);
      ranking.participants.set(attempt.playerUserId, attempt.nickname);
      rankings.set(attempt.gameRoomId, ranking);
    }

    return [...rankings.values()]
      .map((entry) => ({
        ...entry,
        score:
          Math.max(0, entry.score) +
          calculateTeamCompletionBonus({
            difficulty: entry.difficulty,
            missionCleared: entry.missionCleared,
            remainingStrikes: entry.maxStrikeCount - entry.strikeCount,
          }),
      }))
      .sort((left, right) =>
        right.score - left.score || Number(right.missionCleared) - Number(left.missionCleared),
      )
      .map((entry, index) => ({
        rank: index + 1,
        gameRoomId: entry.gameRoomId,
        teamName: entry.teamName ?? '이름 없는 팀',
        score: entry.score,
        difficulty: entry.difficulty,
        missionCleared: entry.missionCleared,
        remainingStrikes: Math.max(0, entry.maxStrikeCount - entry.strikeCount),
        participants: [...entry.participants].map(([userId, nickname]) => ({
          userId,
          nickname,
        })),
      }));
  }

  private loadRankingAttempts(
    gameRoomId?: string,
    registeredOnly = true,
  ): Promise<RankingAttemptRow[]> {
    const conditions = [
      "gr.status = 'FINISHED'",
      "gr.mode = 'MULTIPLAYER'",
      registeredOnly ? 'gr.ranking_registered_at IS NOT NULL' : null,
      gameRoomId ? 'gr.id = $1' : null,
    ].filter((condition): condition is string => Boolean(condition));
    const parameters = gameRoomId ? [gameRoomId] : [];

    return this.dataSource.query(`
      SELECT
        mr.game_room_id AS "gameRoomId",
        mr.turn_id AS "turnId",
        t.player_user_id AS "playerUserId",
        u.nickname AS "nickname",
        gr.difficulty AS "difficulty",
        gr.max_strike_count AS "maxStrikeCount",
        gm.strike_count AS "strikeCount",
        t.started_at AS "startedAt",
        t.deadline_at AS "deadlineAt",
        t.ended_at AS "endedAt",
        mr.judge_status AS "judgeStatus",
        mr.result_payload_json ->> 'stepId' AS "stepId",
        COALESCE((mr.result_payload_json ->> 'isMissionCleared')::boolean, false)
          AS "missionFinished",
        gr.ranking_team_name AS "teamName"
      FROM mission_results mr
      INNER JOIN turns t ON t.id = mr.turn_id
      INNER JOIN users u ON u.id = t.player_user_id
      INNER JOIN game_rooms gr ON gr.id = mr.game_room_id
      INNER JOIN game_room_missions gm ON gm.id = mr.mission_id
      WHERE ${conditions.join('\n        AND ')}
      ORDER BY mr.occurred_at ASC, t.turn_number ASC
    `, parameters);
  }

  private async requireAccessibleFinishedMultiplayerRoom(
    gameRoomId: string,
    userId: string,
  ): Promise<GameRoomEntity> {
    const room = await this.dataSource.getRepository(GameRoomEntity).findOne({
      where: { id: gameRoomId },
    });

    if (!room) {
      throw new NotFoundException({
        code: 'GAME_ROOM_NOT_FOUND',
        message: 'Game room was not found.',
      });
    }
    if (room.mode !== GameMode.MULTIPLAYER || room.status !== GameRoomStatus.FINISHED) {
      throw new ConflictException({
        code: 'RANKING_GAME_NOT_ELIGIBLE',
        message: 'Contributions are available for finished multiplayer games only.',
      });
    }

    const memberships = await this.dataSource.query(
      `SELECT 1
         FROM game_room_participants
        WHERE game_room_id = $1
          AND user_id = $2
          AND membership_status = 'JOINED'
        LIMIT 1`,
      [gameRoomId, userId],
    );
    if (memberships.length === 0) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_RESOURCE_ACCESS',
        message: 'Only participants can view this game contribution.',
      });
    }

    return room;
  }
}

function createIndividualRanking(userId: string, nickname: string): MutableIndividualRanking {
  return {
    userId,
    nickname,
    score: 0,
    clearedSteps: 0,
    failedAttempts: 0,
    firstAttemptClears: 0,
    clearDurationSeconds: 0,
    scoreBreakdown: { clear: 0, firstAttempt: 0, time: 0, failure: 0 },
  };
}

function createTeamRanking(attempt: RankingAttemptRow): MutableTeamRanking {
  return {
    gameRoomId: attempt.gameRoomId,
    difficulty: attempt.difficulty,
    maxStrikeCount: Number(attempt.maxStrikeCount),
    strikeCount: Number(attempt.strikeCount),
    score: 0,
    missionCleared: false,
    participants: new Map<string, string>(),
    teamName: attempt.teamName,
  };
}

function elapsedSeconds(startedAt: Date, endedAt: Date | null): number {
  if (!endedAt) {
    return 0;
  }

  return Math.max(0, (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

function compareIndividualRankings(
  left: MutableIndividualRanking,
  right: MutableIndividualRanking,
): number {
  return (
    Math.max(0, right.score) - Math.max(0, left.score) ||
    right.clearedSteps - left.clearedSteps ||
    left.failedAttempts - right.failedAttempts ||
    left.nickname.localeCompare(right.nickname, 'ko')
  );
}
