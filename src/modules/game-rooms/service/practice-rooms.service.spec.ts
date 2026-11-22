import { ConflictException, NotFoundException } from '@nestjs/common';
import { GameRoomMissionsService } from '@modules/game-room-missions/service/game-room-missions.service';
import { GameMode, GameRoomStatus } from '@shared/enums';
import { TurnsService } from '@modules/turns/service/turns.service';
import { GameStartFlowService } from './game-start-flow.service';
import { GameRoomsService } from './game-rooms.service';
import { PracticeRoomsService } from './practice-rooms.service';

describe('PracticeRoomsService', () => {
  let gameRoomMissionsService: jest.Mocked<
    Pick<GameRoomMissionsService, 'validateMissionTemplateSelection'>
  >;
  let gameRoomsService: jest.Mocked<
    Pick<GameRoomsService, 'createRoom' | 'discardFailedPracticeRoomStart'>
  >;
  let gameStartFlowService: jest.Mocked<Pick<GameStartFlowService, 'startGame'>>;
  let turnsService: jest.Mocked<Pick<TurnsService, 'startReadyPracticeTurn'>>;
  let service: PracticeRoomsService;

  beforeEach(() => {
    gameRoomMissionsService = {
      validateMissionTemplateSelection: jest.fn().mockResolvedValue({}),
    };
    gameRoomsService = {
      createRoom: jest.fn().mockResolvedValue({
        id: 'room-1',
        status: GameRoomStatus.WAITING,
        mode: GameMode.PRACTICE,
      } as never),
      discardFailedPracticeRoomStart: jest.fn().mockResolvedValue(undefined),
    };
    gameStartFlowService = {
      startGame: jest.fn().mockResolvedValue({} as never),
    };
    turnsService = {
      startReadyPracticeTurn: jest.fn().mockResolvedValue({
        turn: {
          id: 'turn-1',
          turnNumber: 1,
          playerUserId: 'user-1',
          startedAt: new Date('2026-11-23T01:00:00.000Z'),
          deadlineAt: new Date('2026-11-23T01:00:30.000Z'),
          status: 'IN_PROGRESS',
        },
        timeLimitSeconds: 30,
      } as never),
    };
    service = new PracticeRoomsService(
      gameRoomMissionsService as never,
      gameRoomsService as never,
      gameStartFlowService as never,
      turnsService as never,
    );
  });

  it('starts the paused first turn only after the practice introduction', async () => {
    await expect(
      service.startTurn({ ownerUserId: 'user-1', gameRoomId: 'room-1' }),
    ).resolves.toMatchObject({
      turnId: 'turn-1',
      timeLimitSeconds: 30,
      remainingTimeSeconds: 30,
      status: 'IN_PROGRESS',
    });

    expect(turnsService.startReadyPracticeTurn).toHaveBeenCalledWith({
      gameRoomId: 'room-1',
      userId: 'user-1',
    });
  });

  it('creates and immediately starts a one-person practice room', async () => {
    await expect(
      service.createAndStart({
        ownerUserId: 'user-1',
        difficulty: 'EASY',
        missionTemplateId: 'template-1',
      }),
    ).resolves.toBeUndefined();

    expect(gameRoomMissionsService.validateMissionTemplateSelection).toHaveBeenCalledWith(
      'EASY',
      'template-1',
    );
    expect(gameRoomsService.createRoom).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      mode: GameMode.PRACTICE,
      difficulty: 'EASY',
      timeLimitSeconds: 30,
      maxStrikeCount: 3,
      minParticipants: 1,
      maxParticipants: 1,
    });
    expect(gameStartFlowService.startGame).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      gameRoomId: 'room-1',
      missionTemplateId: 'template-1',
    });
  });

  it.each([
    new NotFoundException({ code: 'MISSION_TEMPLATE_NOT_FOUND' }),
    new ConflictException({ code: 'MISSION_TEMPLATE_DIFFICULTY_MISMATCH' }),
  ])('does not create a room when mission validation fails', async (error) => {
    gameRoomMissionsService.validateMissionTemplateSelection.mockRejectedValue(error);

    await expect(
      service.createAndStart({
        ownerUserId: 'user-1',
        difficulty: 'EASY',
        missionTemplateId: 'template-1',
      }),
    ).rejects.toBe(error);

    expect(gameRoomsService.createRoom).not.toHaveBeenCalled();
    expect(gameStartFlowService.startGame).not.toHaveBeenCalled();
  });

  it('preserves the existing waiting-room conflict before game start', async () => {
    gameRoomsService.createRoom.mockRejectedValue(
      new ConflictException({ code: 'WAITING_ROOM_MEMBERSHIP_CONFLICT' }),
    );

    await expect(
      service.createAndStart({
        ownerUserId: 'user-1',
        difficulty: 'EASY',
        missionTemplateId: 'template-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'WAITING_ROOM_MEMBERSHIP_CONFLICT' }),
    });

    expect(gameStartFlowService.startGame).not.toHaveBeenCalled();
    expect(gameRoomsService.discardFailedPracticeRoomStart).not.toHaveBeenCalled();
  });

  it('removes only the newly created practice room when start or realtime publication fails', async () => {
    const error = new Error('realtime publication failed');
    gameStartFlowService.startGame.mockRejectedValue(error);

    await expect(
      service.createAndStart({
        ownerUserId: 'user-1',
        difficulty: 'EASY',
        missionTemplateId: 'template-1',
      }),
    ).rejects.toBe(error);

    expect(gameRoomsService.discardFailedPracticeRoomStart).toHaveBeenCalledWith({
      gameRoomId: 'room-1',
      ownerUserId: 'user-1',
    });
  });
});
