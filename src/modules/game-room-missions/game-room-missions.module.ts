import { Module } from '@nestjs/common';
import { GameRoomMissionsService } from './service/game-room-missions.service';

/**
 * Responsibilities: create mission instances on game start, track current step,
 * return hints, finish missions.
 * To be implemented by Worker 2.
 */
@Module({
  providers: [GameRoomMissionsService],
  exports: [GameRoomMissionsService],
})
export class GameRoomMissionsModule {}
