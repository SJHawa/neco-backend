import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@common/decorators/current-user-id.decorator';
import { AuthenticatedRequestGuard } from '@common/guards/authenticated-request.guard';
import { toSeoulIso } from '@common/utils/date.util';
import { GameRoomsService } from '../service/game-rooms.service';

interface GameRoomListItemResponse {
  id: string;
  ownerUserId: string;
  status: string;
  difficulty: string;
  timeLimitSeconds: number;
  maxStrikeCount: number;
  minParticipants: number;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
}

@Controller('game-rooms')
@UseGuards(AuthenticatedRequestGuard)
export class GameRoomsController {
  constructor(private readonly gameRoomsService: GameRoomsService) {}

  @Get()
  async listAccessibleRooms(
    @CurrentUserId() userId: string,
  ): Promise<GameRoomListItemResponse[]> {
    const rooms = await this.gameRoomsService.listAccessibleRooms(userId);

    return rooms.map((room) => ({
      id: room.id,
      ownerUserId: room.ownerUserId,
      status: room.status,
      difficulty: room.difficulty,
      timeLimitSeconds: room.timeLimitSeconds,
      maxStrikeCount: room.maxStrikeCount,
      minParticipants: room.minParticipants,
      maxParticipants: room.maxParticipants,
      createdAt: toSeoulIso(room.createdAt),
      updatedAt: toSeoulIso(room.updatedAt),
    }));
  }
}
