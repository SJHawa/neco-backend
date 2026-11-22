import { PracticeRoomsController } from './practice-rooms.controller';
import { PracticeRoomsService } from '../service/practice-rooms.service';

describe('PracticeRoomsController', () => {
  it('returns only success after the practice room start flow completes', async () => {
    const practiceRoomsService: jest.Mocked<
      Pick<PracticeRoomsService, 'createAndStart' | 'startTurn'>
    > = {
      createAndStart: jest.fn().mockResolvedValue(undefined),
      startTurn: jest.fn(),
    };
    const controller = new PracticeRoomsController(practiceRoomsService as never);

    await expect(
      controller.createPracticeRoom('user-1', {
        difficulty: 'HARD',
        missionTemplateId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toEqual({ success: true });

    expect(practiceRoomsService.createAndStart).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      difficulty: 'HARD',
      missionTemplateId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('starts the prepared practice turn after the client introduction', async () => {
    const turnState = {
      turnId: '22222222-2222-4222-8222-222222222222',
      turnNumber: 1,
      currentPlayerId: 'user-1',
      startedAt: '2026-11-23T10:00:00.000+09:00',
      deadlineAt: '2026-11-23T10:00:30.000+09:00',
      timeLimitSeconds: 30,
      remainingTimeSeconds: 30,
      status: 'IN_PROGRESS' as const,
    };
    const practiceRoomsService: jest.Mocked<
      Pick<PracticeRoomsService, 'createAndStart' | 'startTurn'>
    > = {
      createAndStart: jest.fn(),
      startTurn: jest.fn().mockResolvedValue(turnState),
    };
    const controller = new PracticeRoomsController(practiceRoomsService as never);
    const gameRoomId = '11111111-1111-4111-8111-111111111111';

    await expect(
      controller.startPracticeTurn('user-1', gameRoomId),
    ).resolves.toEqual({ success: true, turnState });
    expect(practiceRoomsService.startTurn).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      gameRoomId,
    });
  });
});
