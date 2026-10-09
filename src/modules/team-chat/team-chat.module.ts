import { Module } from '@nestjs/common';
import { AuthenticatedRequestGuard } from '@common/guards/authenticated-request.guard';
import { TeamChatController } from './controller/team-chat.controller';
import { TeamChatMessageEntity } from './entity/team-chat-message.entity';
import { TeamChatService } from './service/team-chat.service';

@Module({
  controllers: [TeamChatController],
  providers: [AuthenticatedRequestGuard, TeamChatService],
  exports: [TeamChatService],
})
export class TeamChatModule {}
