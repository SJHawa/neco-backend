import { EntityManager } from 'typeorm';
import { GameItemType, MissionResultJudgeStatus } from '@shared/enums';
import { GameRoomItemEntity } from '../entity/game-room-item.entity';
import { GameItemUnlockService } from './game-item-unlock.service';

describe('GameItemUnlockService', () => {
  const gameRoomId = '00000000-0000-4000-8000-000000000001';
  const occurredAt = new Date('2026-11-09T03:00:00Z');
  let service: GameItemUnlockService;
  let findOne: jest.Mock;
  let save: jest.Mock;
  let query: jest.Mock;
  let manager: EntityManager;

  beforeEach(() => {
    service = new GameItemUnlockService();
    findOne = jest.fn(({ where }) => Promise.resolve({
      itemType: where.itemType,
      quantity: 0,
      unlockedAt: null,
      unlockReason: null,
    }));
    save = jest.fn((item) => Promise.resolve(item));
    query = jest.fn().mockResolvedValue([]);
    manager = {
      query,
      getRepository: (entity: unknown) => {
        expect(entity).toBe(GameRoomItemEntity);
        return { findOne, save };
      },
    } as unknown as EntityManager;
  });

  it('unlocks the time extension after the first passed step', async () => {
    await expect(service.unlockAfterJudgment({
      manager, gameRoomId, judgeStatus: MissionResultJudgeStatus.PASSED, occurredAt,
    })).resolves.toEqual([{
      itemType: GameItemType.TIME_EXTENSION_30,
      reason: 'FIRST_STEP_CLEAR',
      quantity: 1,
    }]);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ unlockedAt: occurredAt, quantity: 1 }));
  });

  it('also unlocks turn pass after two consecutive passed steps', async () => {
    query.mockResolvedValue([{ judgeStatus: MissionResultJudgeStatus.PASSED }]);
    const unlocked = await service.unlockAfterJudgment({
      manager, gameRoomId, judgeStatus: MissionResultJudgeStatus.PASSED, occurredAt,
    });
    expect(unlocked.map((item) => item.itemType)).toEqual([
      GameItemType.TIME_EXTENSION_30,
      GameItemType.TURN_PASS,
    ]);
  });

  it('unlocks strike shield after the first failed attempt', async () => {
    await expect(service.unlockAfterJudgment({
      manager, gameRoomId, judgeStatus: MissionResultJudgeStatus.FAILED, occurredAt,
    })).resolves.toEqual([{
      itemType: GameItemType.STRIKE_SHIELD,
      reason: 'FIRST_FAILED_ATTEMPT',
      quantity: 1,
    }]);
  });

  it('does not grant an already unlocked item again', async () => {
    findOne.mockResolvedValue({
      itemType: GameItemType.TIME_EXTENSION_30,
      quantity: 0,
      unlockedAt: occurredAt,
    });
    await expect(service.unlockAfterJudgment({
      manager, gameRoomId, judgeStatus: MissionResultJudgeStatus.PASSED, occurredAt,
    })).resolves.toEqual([]);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not unlock items for evaluation errors', async () => {
    await expect(service.unlockAfterJudgment({
      manager, gameRoomId, judgeStatus: MissionResultJudgeStatus.ERROR, occurredAt,
    })).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
  });
});
