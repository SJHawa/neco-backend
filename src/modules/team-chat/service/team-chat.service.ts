import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { User } from '@modules/auth/entity/user.entity';
import { GameRoomParticipantEntity } from '@modules/game-room-participants/entity/game-room-participant.entity';
import { GameRoomParticipantMembershipStatus } from '@shared/enums';
import { toSeoulIso } from '@common/utils/date.util';
import { DataSource } from 'typeorm';
import { TeamChatMessageEntity } from '../entity/team-chat-message.entity';

export interface TeamChatMessageView {
  messageId: string;
  gameRoomId: string;
  senderUserId: string;
  senderNickname: string;
  content: string;
  clientMessageId: string | null;
  createdAt: string;
}

@Injectable()
export class TeamChatService {
  constructor(private readonly dataSource: DataSource) {}

  async listMessages(gameRoomId: string, userId: string): Promise<TeamChatMessageView[]> {
    await this.ensureRoomAccess(gameRoomId, userId);
    const messages = await this.dataSource.getRepository(TeamChatMessageEntity).find({
      where: { gameRoomId },
      order: { createdAt: 'ASC' },
    });
    return this.toViews(messages);
  }

  async createMessage(input: {
    gameRoomId: string;
    userId: string;
    content: string;
    clientMessageId?: string;
  }): Promise<TeamChatMessageView> {
    await this.ensureRoomAccess(input.gameRoomId, input.userId);
    const repository = this.dataSource.getRepository(TeamChatMessageEntity);
    const existing = input.clientMessageId
      ? await repository.findOne({ where: { gameRoomId: input.gameRoomId, clientMessageId: input.clientMessageId } })
      : null;
    if (existing) {
      return (await this.toViews([existing]))[0];
    }
    const message = await repository.save(repository.create({
      gameRoomId: input.gameRoomId,
      senderUserId: input.userId,
      clientMessageId: input.clientMessageId ?? null,
      content: input.content.trim(),
    }));
    return (await this.toViews([message]))[0];
  }

  private async ensureRoomAccess(gameRoomId: string, userId: string): Promise<void> {
    const participant = await this.dataSource.getRepository(GameRoomParticipantEntity).findOne({
      where: {
        gameRoomId,
        userId,
        membershipStatus: In([
          GameRoomParticipantMembershipStatus.JOINED,
          GameRoomParticipantMembershipStatus.INVITED,
        ]),
      },
    });
    if (!participant) {
      throw new ForbiddenException({ code: 'FORBIDDEN_RESOURCE_ACCESS', message: 'User does not have access to this game room.' });
    }
  }

  private async toViews(messages: TeamChatMessageEntity[]): Promise<TeamChatMessageView[]> {
    if (messages.length === 0) return [];
    const users = await this.dataSource.getRepository(User).find({
      where: { id: In([...new Set(messages.map((message) => message.senderUserId))]) },
    });
    const nicknames = new Map(users.map((user) => [user.id, user.nickname] as const));
    return messages.map((message) => ({
      messageId: message.id,
      gameRoomId: message.gameRoomId,
      senderUserId: message.senderUserId,
      senderNickname: nicknames.get(message.senderUserId) ?? message.senderUserId,
      content: message.content,
      clientMessageId: message.clientMessageId,
      createdAt: toSeoulIso(message.createdAt),
    }));
  }
}
