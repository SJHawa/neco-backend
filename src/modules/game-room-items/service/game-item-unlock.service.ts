import { EntityManager } from 'typeorm';
import { MissionResultJudgeStatus, GameItemType } from '@shared/enums';
import { GameRoomItemEntity } from '../entity/game-room-item.entity';

export interface UnlockedGameItem {
  itemType: GameItemType;
  reason: string;
  quantity: number;
}

export class GameItemUnlockService {
  async unlockAfterJudgment(input: {
    manager: EntityManager;
    gameRoomId: string;
    judgeStatus: MissionResultJudgeStatus;
    occurredAt: Date;
  }): Promise<UnlockedGameItem[]> {
    if (input.judgeStatus === MissionResultJudgeStatus.ERROR) return [];

    const repository = input.manager.getRepository(GameRoomItemEntity);
    const candidates = await this.resolveCandidates(input);
    const unlocked: UnlockedGameItem[] = [];

    for (const candidate of candidates) {
      const item = await repository.findOne({
        where: { gameRoomId: input.gameRoomId, itemType: candidate.itemType },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item || item.unlockedAt) continue;

      item.quantity += 1;
      item.unlockedAt = input.occurredAt;
      item.unlockReason = candidate.reason;
      await repository.save(item);
      unlocked.push({
        itemType: item.itemType,
        reason: candidate.reason,
        quantity: item.quantity,
      });
    }

    return unlocked;
  }

  private async resolveCandidates(input: {
    manager: EntityManager;
    gameRoomId: string;
    judgeStatus: MissionResultJudgeStatus;
  }): Promise<Array<{ itemType: GameItemType; reason: string }>> {
    const candidates: Array<{ itemType: GameItemType; reason: string }> = [];
    const previousRows = (await input.manager.query(
      `SELECT judge_status AS "judgeStatus"
         FROM mission_results
        WHERE game_room_id = $1
          AND judge_status <> 'ERROR'
        ORDER BY occurred_at DESC
        LIMIT 1`,
      [input.gameRoomId],
    )) ?? [];
    const previousStatus = previousRows[0]?.judgeStatus as MissionResultJudgeStatus | undefined;

    if (input.judgeStatus === MissionResultJudgeStatus.PASSED) {
      candidates.push({
        itemType: GameItemType.TIME_EXTENSION_30,
        reason: 'FIRST_STEP_CLEAR',
      });
      if (previousStatus === MissionResultJudgeStatus.PASSED) {
        candidates.push({
          itemType: GameItemType.TURN_PASS,
          reason: 'TWO_CONSECUTIVE_CLEARS',
        });
      }
    }

    if (input.judgeStatus === MissionResultJudgeStatus.FAILED) {
      candidates.push({
        itemType: GameItemType.STRIKE_SHIELD,
        reason: 'FIRST_FAILED_ATTEMPT',
      });
    }

    return candidates;
  }
}
