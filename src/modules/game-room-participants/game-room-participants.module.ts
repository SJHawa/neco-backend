import { Module } from '@nestjs/common';
import { GameRoomParticipantsService } from './service/game-room-participants.service';

/**
 * Responsibilities: list participants, create/accept/deny invitations, process leave.
 * To be implemented by Worker 2.
 */
@Module({
  providers: [GameRoomParticipantsService],
  exports: [GameRoomParticipantsService],
})
export class GameRoomParticipantsModule {}
