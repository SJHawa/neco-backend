import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { GameRoomParticipantEntity } from '@modules/game-room-participants/entity/game-room-participant.entity';
import { GameRoomEntity } from '../entity/game-room.entity';
import {
  GameRoomParticipantMembershipStatus,
  GameRoomParticipantRole,
  GameRoomStatus,
} from '@shared/enums';

export interface CreateGameRoomInput {
  ownerUserId: string;
  difficulty: string;
  timeLimitSeconds: number;
  maxStrikeCount: number;
  minParticipants: number;
  maxParticipants: number;
}

@Injectable()
export class GameRoomsService {
  constructor(private readonly dataSource: DataSource) {}

  async createRoom(input: CreateGameRoomInput): Promise<GameRoomEntity> {
    return this.dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(GameRoomEntity);
      const participantRepository = manager.getRepository(GameRoomParticipantEntity);

      await this.acquireWaitingRoomLock(manager, input.ownerUserId);
      await this.ensureNoWaitingRoomMembership(participantRepository, input.ownerUserId);

      const gameRoom = roomRepository.create({
        ownerUserId: input.ownerUserId,
        status: GameRoomStatus.WAITING,
        difficulty: input.difficulty,
        timeLimitSeconds: input.timeLimitSeconds,
        maxStrikeCount: input.maxStrikeCount,
        minParticipants: input.minParticipants,
        maxParticipants: input.maxParticipants,
      });

      const savedRoom = await roomRepository.save(gameRoom);

      const ownerParticipant = participantRepository.create({
        gameRoomId: savedRoom.id,
        userId: input.ownerUserId,
        role: GameRoomParticipantRole.OWNER,
        membershipStatus: GameRoomParticipantMembershipStatus.JOINED,
      });

      await participantRepository.save(ownerParticipant);

      return savedRoom;
    });
  }

  private async ensureNoWaitingRoomMembership(
    participantRepository: Repository<GameRoomParticipantEntity>,
    userId: string,
  ): Promise<void> {
    const waitingMemberships = await participantRepository.find({
      relations: { gameRoom: true },
      where: {
        userId,
        membershipStatus: In([
          GameRoomParticipantMembershipStatus.INVITED,
          GameRoomParticipantMembershipStatus.JOINED,
        ]),
        gameRoom: {
          status: GameRoomStatus.WAITING,
        },
      },
    });

    if (waitingMemberships.length > 0) {
      throw new ConflictException({
        code: 'WAITING_ROOM_MEMBERSHIP_CONFLICT',
        message: 'User already belongs to a waiting room.',
      });
    }
  }

  private async acquireWaitingRoomLock(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [userId],
    );
  }
}
