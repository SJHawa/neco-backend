import { Module } from '@nestjs/common';
import { GameRoomsService } from './service/game-rooms.service';

/**
 * Responsibilities: list accessible rooms, create rooms, return room state, start games.
 * Dependencies: game-room-missions (setup), integrations/runtime (docker preparation).
 * To be implemented by Worker 2.
 */
@Module({
  providers: [GameRoomsService],
  exports: [GameRoomsService],
})
export class GameRoomsModule {}
