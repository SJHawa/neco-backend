import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { toSeoulIso } from '../../common/utils/date.util';
import {
  AiChatMessageSenderType,
  AiChatMessageType,
  AiChatRequestStatus,
} from '../../shared/enums/ai-chat.enum';
import {
  AI_CHAT_ERROR,
  throwAiChatError,
  throwForbiddenAccess,
} from './constants/ai-chat-error.constants';
import { AI_CHAT_REQUEST_TYPE_UNPARSED } from './constants/ai-chat-internal.constants';
import { CreateAiChatMessageDto } from './dto/create-ai-chat-message.dto';
import { ListAiChatSessionsQueryDto } from './dto/list-ai-chat-sessions-query.dto';
import { AiChatMessage } from './entity/ai-chat-message.entity';
import { AiChatRequest } from './entity/ai-chat-request.entity';
import { AiChatSession } from './entity/ai-chat-session.entity';

const W1_2_ASSISTANT_ACK_CONTENT =
  '메시지를 저장했습니다. 명령 해석이 완료되면 안내해 드릴게요.';

export interface AiChatSessionListItem {
  aiChatSessionId: string;
  requesterUserId: string;
  gameRoomId: string | null;
  status: string;
  provider: string;
  llmModel: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface AiChatMessageItem {
  messageId: string;
  aiChatRequestId: string | null;
  senderType: string;
  messageType: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** Matches docs/etc/api-spec.md §9 POST messages success schema. */
export interface CreateAiChatMessageResult {
  aiChatRequestId: string;
  /** Required when requestStatus is COMPLETED or FAILED; omitted when RECEIVED. */
  requestType?: string;
  requestStatus: string;
  userMessage: AiChatMessageItem;
  assistantMessage: AiChatMessageItem;
  commandResult: null;
}

@Injectable()
export class AiChatSessionsService {
  constructor(
    @InjectRepository(AiChatSession)
    private readonly aiChatSessionRepository: Repository<AiChatSession>,
    @InjectRepository(AiChatMessage)
    private readonly aiChatMessageRepository: Repository<AiChatMessage>,
    @InjectRepository(AiChatRequest)
    private readonly aiChatRequestRepository: Repository<AiChatRequest>,
    private readonly dataSource: DataSource,
  ) {}

  async listSessions(
    user: AuthenticatedUser,
    query: ListAiChatSessionsQueryDto,
  ): Promise<AiChatSessionListItem[]> {
    if (query.userId && query.userId !== user.userId) {
      throwForbiddenAccess('userId does not match the authenticated user');
    }

    const where: FindOptionsWhere<AiChatSession> = {
      requesterUserId: user.userId,
    };

    if (query.gameRoomId) {
      where.gameRoomId = query.gameRoomId;
    }

    const sessions = await this.aiChatSessionRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });

    return sessions.map((session) => this.toSessionListItem(session));
  }

  async listMessages(
    user: AuthenticatedUser,
    aiChatSessionId: string,
  ): Promise<AiChatMessageItem[]> {
    const session = await this.requireOwnedSession(user.userId, aiChatSessionId);

    const messages = await this.aiChatMessageRepository.find({
      where: { aiChatSessionId: session.id },
      order: { createdAt: 'ASC' },
    });

    return messages.map((message) => this.toMessageItem(message));
  }

  async createMessage(
    user: AuthenticatedUser,
    aiChatSessionId: string,
    dto: CreateAiChatMessageDto,
  ): Promise<CreateAiChatMessageResult> {
    await this.requireOwnedSession(user.userId, aiChatSessionId);

    const now = new Date();

    return this.dataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(AiChatRequest);
      const messageRepo = manager.getRepository(AiChatMessage);

      const request = requestRepo.create({
        aiChatSessionId,
        requestType: AI_CHAT_REQUEST_TYPE_UNPARSED,
        sourceMessageId: null,
        requestPayload: { message: dto.message },
        responsePayload: null,
        status: AiChatRequestStatus.RECEIVED,
        requestedAt: now,
        respondedAt: null,
      });
      const savedRequest = await requestRepo.save(request);

      const userMessage = messageRepo.create({
        aiChatSessionId,
        aiChatRequestId: savedRequest.id,
        senderType: AiChatMessageSenderType.USER,
        senderUserId: user.userId,
        messageType: AiChatMessageType.TEXT,
        content: dto.message,
        metadataJson: null,
      });
      const savedUserMessage = await messageRepo.save(userMessage);

      const assistantMessage = messageRepo.create({
        aiChatSessionId,
        aiChatRequestId: savedRequest.id,
        senderType: AiChatMessageSenderType.ASSISTANT,
        senderUserId: null,
        messageType: AiChatMessageType.SYSTEM_NOTICE,
        content: W1_2_ASSISTANT_ACK_CONTENT,
        metadataJson: { intentParsingPending: true },
      });
      const savedAssistantMessage = await messageRepo.save(assistantMessage);

      savedRequest.sourceMessageId = savedUserMessage.id;
      await requestRepo.save(savedRequest);

      // api-spec §9: RECEIVED responses omit requestType until intent parsing (W1-3).
      return {
        aiChatRequestId: savedRequest.id,
        requestStatus: AiChatRequestStatus.RECEIVED,
        userMessage: this.toMessageItem(savedUserMessage),
        assistantMessage: this.toMessageItem(savedAssistantMessage),
        commandResult: null,
      };
    });
  }

  private async requireOwnedSession(
    userId: string,
    aiChatSessionId: string,
  ): Promise<AiChatSession> {
    const session = await this.aiChatSessionRepository.findOne({
      where: { id: aiChatSessionId, requesterUserId: userId },
    });

    if (!session) {
      throwAiChatError(
        AI_CHAT_ERROR.SESSION_NOT_FOUND,
        'AI chat session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return session;
  }

  private toSessionListItem(session: AiChatSession): AiChatSessionListItem {
    return {
      aiChatSessionId: session.id,
      requesterUserId: session.requesterUserId,
      gameRoomId: session.gameRoomId,
      status: session.status,
      provider: session.provider,
      llmModel: session.llmModel,
      createdAt: toSeoulIso(session.createdAt),
      updatedAt: toSeoulIso(session.updatedAt),
      closedAt: session.closedAt ? toSeoulIso(session.closedAt) : null,
    };
  }

  private toMessageItem(message: AiChatMessage): AiChatMessageItem {
    return {
      messageId: message.id,
      aiChatRequestId: message.aiChatRequestId,
      senderType: message.senderType,
      messageType: message.messageType,
      content: message.content,
      metadata: message.metadataJson,
      createdAt: toSeoulIso(message.createdAt),
    };
  }
}
