import { HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AiChatMessageSenderType,
  AiChatMessageType,
  AiChatRequestStatus,
  AiChatRequestType,
} from '../../shared/enums/ai-chat.enum';
import { AI_CHAT_ERROR } from './constants/ai-chat-error.constants';
import { AI_CHAT_REQUEST_TYPE_UNPARSED } from './constants/ai-chat-internal.constants';
import { AiChatSessionsService } from './ai-chat-sessions.service';
import { AiChatMessage } from './entity/ai-chat-message.entity';
import { AiChatRequest } from './entity/ai-chat-request.entity';
import { AiChatSession } from './entity/ai-chat-session.entity';

describe('AiChatSessionsService', () => {
  const user = { userId: 'user-1', loginId: 'player1' };
  const sessionId = 'session-1';

  let aiChatSessionRepository: jest.Mocked<Repository<AiChatSession>>;
  let aiChatMessageRepository: jest.Mocked<Repository<AiChatMessage>>;
  let aiChatRequestRepository: jest.Mocked<Repository<AiChatRequest>>;
  let dataSource: jest.Mocked<DataSource>;
  let service: AiChatSessionsService;

  beforeEach(() => {
    aiChatSessionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<AiChatSession>>;

    aiChatMessageRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<AiChatMessage>>;

    aiChatRequestRepository = {} as unknown as jest.Mocked<Repository<AiChatRequest>>;

    dataSource = {
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    service = new AiChatSessionsService(
      aiChatSessionRepository,
      aiChatMessageRepository,
      aiChatRequestRepository,
      dataSource,
    );
  });

  describe('listSessions', () => {
    it('returns mapped sessions for the authenticated user', async () => {
      const createdAt = new Date('2026-05-04T00:10:00Z');
      const updatedAt = new Date('2026-05-04T00:12:00Z');

      aiChatSessionRepository.find.mockResolvedValue([
        {
          id: sessionId,
          requesterUserId: user.userId,
          gameRoomId: null,
          status: 'ACTIVE',
          provider: 'openai',
          llmModel: 'gpt-4o',
          createdAt,
          updatedAt,
          closedAt: null,
        } as AiChatSession,
      ]);

      const result = await service.listSessions(user, {});

      expect(aiChatSessionRepository.find).toHaveBeenCalledWith({
        where: { requesterUserId: user.userId },
        order: { createdAt: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        aiChatSessionId: sessionId,
        requesterUserId: user.userId,
        status: 'ACTIVE',
        closedAt: null,
      });
      expect(result[0].createdAt).toContain('+09:00');
    });

    it('returns an empty list when the user has no session', async () => {
      aiChatSessionRepository.find.mockResolvedValue([]);
      await expect(service.listSessions(user, {})).resolves.toEqual([]);
    });

    it('rejects userId that does not match the authenticated user', async () => {
      await expect(
        service.listSessions(user, { userId: 'other-user' }),
      ).rejects.toMatchObject({
        response: {
          code: 'FORBIDDEN_RESOURCE_ACCESS',
        },
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('filters by gameRoomId when provided', async () => {
      const gameRoomId = 'room-1';
      aiChatSessionRepository.find.mockResolvedValue([]);

      await service.listSessions(user, { gameRoomId });

      expect(aiChatSessionRepository.find).toHaveBeenCalledWith({
        where: { requesterUserId: user.userId, gameRoomId },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('listMessages', () => {
    it('returns messages for an owned session', async () => {
      aiChatSessionRepository.findOne.mockResolvedValue({
        id: sessionId,
        requesterUserId: user.userId,
      } as AiChatSession);

      aiChatMessageRepository.find.mockResolvedValue([
        {
          id: 'msg-1',
          aiChatSessionId: sessionId,
          aiChatRequestId: null,
          senderType: AiChatMessageSenderType.ASSISTANT,
          messageType: AiChatMessageType.SYSTEM_NOTICE,
          content: 'welcome',
          metadataJson: null,
          createdAt: new Date('2026-05-04T00:10:00Z'),
        } as AiChatMessage,
      ]);

      const result = await service.listMessages(user, sessionId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        messageId: 'msg-1',
        aiChatRequestId: null,
        senderType: AiChatMessageSenderType.ASSISTANT,
      });
    });

    it('returns an empty list when there are no messages', async () => {
      aiChatSessionRepository.findOne.mockResolvedValue({
        id: sessionId,
        requesterUserId: user.userId,
      } as AiChatSession);
      aiChatMessageRepository.find.mockResolvedValue([]);

      await expect(service.listMessages(user, sessionId)).resolves.toEqual([]);
    });

    it('returns 404 when the session is not owned by the user', async () => {
      aiChatSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.listMessages(user, sessionId)).rejects.toMatchObject({
        response: { code: AI_CHAT_ERROR.SESSION_NOT_FOUND },
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('createMessage', () => {
    it('persists request and user/assistant messages in a transaction', async () => {
      aiChatSessionRepository.findOne.mockResolvedValue({
        id: sessionId,
        requesterUserId: user.userId,
      } as AiChatSession);

      const savedRequest = {
        id: 'request-1',
        requestType: AI_CHAT_REQUEST_TYPE_UNPARSED,
        status: AiChatRequestStatus.RECEIVED,
      } as AiChatRequest;

      const savedUserMessage = {
        id: 'msg-user',
        aiChatRequestId: 'request-1',
        senderType: AiChatMessageSenderType.USER,
        messageType: AiChatMessageType.TEXT,
        content: '방 만들어줘',
        metadataJson: null,
        createdAt: new Date('2026-05-04T00:11:00Z'),
      } as AiChatMessage;

      const savedAssistantMessage = {
        id: 'msg-assistant',
        aiChatRequestId: 'request-1',
        senderType: AiChatMessageSenderType.ASSISTANT,
        messageType: AiChatMessageType.SYSTEM_NOTICE,
        content: '메시지를 저장했습니다. 명령 해석이 완료되면 안내해 드릴게요.',
        metadataJson: null,
        createdAt: new Date('2026-05-04T00:11:01Z'),
      } as AiChatMessage;

      const requestRepo = {
        create: jest.fn((value) => value as AiChatRequest),
        save: jest
          .fn()
          .mockResolvedValueOnce(savedRequest)
          .mockResolvedValueOnce(savedRequest),
      };

      const messageRepo = {
        create: jest.fn((value) => value as AiChatMessage),
        save: jest
          .fn()
          .mockResolvedValueOnce(savedUserMessage)
          .mockResolvedValueOnce(savedAssistantMessage),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback: (manager: { getRepository: (entity: unknown) => unknown }) => unknown) => {
          const manager = {
            getRepository: (entity: unknown) => {
              if (entity === AiChatRequest) {
                return requestRepo;
              }
              if (entity === AiChatMessage) {
                return messageRepo;
              }
              throw new Error('Unexpected entity');
            },
          };
          return callback(manager);
        },
      );

      const result = await service.createMessage(user, sessionId, {
        message: '방 만들어줘',
      });

      expect(requestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          aiChatSessionId: sessionId,
          requestType: AI_CHAT_REQUEST_TYPE_UNPARSED,
          status: AiChatRequestStatus.RECEIVED,
          requestPayload: { message: '방 만들어줘' },
        }),
      );
      expect(requestRepo.save).toHaveBeenCalledTimes(2);
      expect(messageRepo.save).toHaveBeenCalledTimes(2);
      expect(result.requestStatus).toBe(AiChatRequestStatus.RECEIVED);
      expect(result).not.toHaveProperty('requestType');
      expect(result).toMatchObject({
        aiChatRequestId: 'request-1',
        commandResult: null,
        userMessage: expect.objectContaining({
          messageId: 'msg-user',
          senderType: AiChatMessageSenderType.USER,
        }),
        assistantMessage: expect.objectContaining({
          messageId: 'msg-assistant',
          senderType: AiChatMessageSenderType.ASSISTANT,
        }),
      });
    });

    it.each(['방 만들어줘', '초대 수락할게', '게임 시작해줘'])(
      'omits requestType and keeps RECEIVED for "%s" per api-spec §9',
      async (message) => {
        aiChatSessionRepository.findOne.mockResolvedValue({
          id: sessionId,
          requesterUserId: user.userId,
        } as AiChatSession);

        const savedRequest = {
          id: 'request-1',
          requestType: AI_CHAT_REQUEST_TYPE_UNPARSED,
          status: AiChatRequestStatus.RECEIVED,
        } as AiChatRequest;

        const requestRepo = {
          create: jest.fn((value) => ({ ...value, id: 'request-1' }) as AiChatRequest),
          save: jest.fn().mockResolvedValue(savedRequest),
        };

        const messageRepo = {
          create: jest.fn((value) => value as AiChatMessage),
          save: jest
            .fn()
            .mockResolvedValueOnce({ id: 'msg-user' } as AiChatMessage)
            .mockResolvedValueOnce({ id: 'msg-assistant' } as AiChatMessage),
        };

        (dataSource.transaction as jest.Mock).mockImplementation(
          async (callback: (manager: { getRepository: (entity: unknown) => unknown }) => unknown) => {
            const manager = {
              getRepository: (entity: unknown) => {
                if (entity === AiChatRequest) {
                  return requestRepo;
                }
                if (entity === AiChatMessage) {
                  return messageRepo;
                }
                throw new Error('Unexpected entity');
              },
            };
            return callback(manager);
          },
        );

        const result = await service.createMessage(user, sessionId, { message });

        expect(result.requestStatus).toBe(AiChatRequestStatus.RECEIVED);
        expect(result).not.toHaveProperty('requestType');
        expect(result.commandResult).toBeNull();
        for (const commandType of Object.values(AiChatRequestType)) {
          expect(result).not.toHaveProperty('requestType', commandType);
        }
      },
    );

    it('returns 404 when posting to a session not owned by the user', async () => {
      aiChatSessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createMessage(user, sessionId, { message: 'hello' }),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });
});
