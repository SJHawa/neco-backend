import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@common/decorators/current-user-id.decorator';
import { AuthenticatedRequestGuard } from '@common/guards/authenticated-request.guard';
import { SendTeamChatMessageDto } from '../dto/send-team-chat-message.dto';
import { TeamChatService } from '../service/team-chat.service';

@Controller('game-rooms/:gameRoomId/team-chat/messages')
@UseGuards(AuthenticatedRequestGuard)
export class TeamChatController {
  constructor(private readonly teamChatService: TeamChatService) {}

  @Get()
  list(@Param('gameRoomId') gameRoomId: string, @CurrentUserId() userId: string) {
    return this.teamChatService.listMessages(gameRoomId, userId);
  }

  @Post()
  create(
    @Param('gameRoomId') gameRoomId: string,
    @CurrentUserId() userId: string,
    @Body() body: SendTeamChatMessageDto,
  ) {
    return this.teamChatService.createMessage({
      gameRoomId,
      userId,
      content: body.content,
      clientMessageId: body.clientMessageId,
    });
  }
}
