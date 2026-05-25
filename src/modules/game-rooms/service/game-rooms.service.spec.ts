/// <reference types="jest" />

import { DataSource, Repository } from 'typeorm';
import { GameRoomParticipantEntity } from '@modules/game-room-participants/entity/game-room-participant.entity';
import { GameRoomsService } from './game-rooms.service';
import { GameRoomEntity } from '../entity/game-room.entity';
import {
  GameRoomParticipantMembershipStatus,
  GameRoomParticipantRole,
  GameRoomStatus,
} from '@shared/enums';

describe('GameRoomsService', () => {
  let service: GameRoomsService;
  let roomRepository: jest.Mocked<Pick<Repository<GameRoomEntity>, 'create' | 'save'>>;
  let participantRepository: jest.Mocked<
    Pick<Repository<GameRoomParticipantEntity>, 'create' | 'save' | 'find'>
  >;
  let manager: { getRepository: jest.Mock; query: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    roomRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    participantRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === GameRoomEntity) {
          return roomRepository;
        }

        return participantRepository;
      }),
      query: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    service = new GameRoomsService(dataSource as unknown as DataSource);
  });

  it('creates a waiting room with an owner participant', async () => {
    participantRepository.find.mockResolvedValue([]);
    roomRepository.create.mockReturnValue({
      ownerUserId: 'owner-1',
      status: GameRoomStatus.WAITING,
      difficulty: 'EASY',
      timeLimitSeconds: 600,
      maxStrikeCount: 3,
      minParticipants: 2,
      maxParticipants: 4,
    } as GameRoomEntity);
    roomRepository.save.mockResolvedValue({
      id: 'room-1',
      ownerUserId: 'owner-1',
      status: GameRoomStatus.WAITING,
    } as GameRoomEntity);
    participantRepository.create.mockReturnValue({
      gameRoomId: 'room-1',
      userId: 'owner-1',
      role: GameRoomParticipantRole.OWNER,
      membershipStatus: GameRoomParticipantMembershipStatus.JOINED,
    } as GameRoomParticipantEntity);

    const result = await service.createRoom({
      ownerUserId: 'owner-1',
      difficulty: 'EASY',
      timeLimitSeconds: 600,
      maxStrikeCount: 3,
      minParticipants: 2,
      maxParticipants: 4,
    });

    expect(result.id).toBe('room-1');
    expect(dataSource.transaction).toHaveBeenCalled();
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      ['owner-1'],
    );
    expect(roomRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'owner-1',
        status: GameRoomStatus.WAITING,
      }),
    );
    expect(participantRepository.create).toHaveBeenCalledWith({
      gameRoomId: 'room-1',
      userId: 'owner-1',
      role: GameRoomParticipantRole.OWNER,
      membershipStatus: GameRoomParticipantMembershipStatus.JOINED,
    });
  });

  it('rejects creating a room when the owner already belongs to a waiting room', async () => {
    participantRepository.find.mockResolvedValue([
      {
        id: 'participant-1',
        gameRoomId: 'room-existing',
      } as GameRoomParticipantEntity,
    ]);

    await expect(
      service.createRoom({
        ownerUserId: 'owner-1',
        difficulty: 'EASY',
        timeLimitSeconds: 600,
        maxStrikeCount: 3,
        minParticipants: 2,
        maxParticipants: 4,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'WAITING_ROOM_MEMBERSHIP_CONFLICT',
      }),
    });

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(roomRepository.save).not.toHaveBeenCalled();
    expect(participantRepository.save).not.toHaveBeenCalled();
  });
});
