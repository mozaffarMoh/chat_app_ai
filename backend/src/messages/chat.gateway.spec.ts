import { Test, type TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway.js';
import { MessagesService } from './messages.service.js';
import { ConversationsService } from '../conversations/conversations.service.js';
import { UsersService } from '../users/users.service.js';

type MockSocket = {
  id: string;
  data: { userId: string };
  join: jest.Mock;
  leave: jest.Mock;
  emit: jest.Mock;
  to: jest.Mock;
};

const makeSocket = (userId: string): MockSocket => ({
  id: 'socket-1',
  data: { userId },
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
});

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockMessagesService: { create: jest.Mock; markRead: jest.Mock };
  let mockConversationsService: {
    findAllForUser: jest.Mock;
    updateBoardStatus: jest.Mock;
  };
  let mockUsersService: { updatePresence: jest.Mock };

  beforeEach(async () => {
    mockMessagesService = {
      create: jest.fn(),
      markRead: jest.fn(),
    };
    mockConversationsService = {
      findAllForUser: jest.fn().mockResolvedValue([{ id: 'conv-1' }]),
      updateBoardStatus: jest.fn(),
    };
    mockUsersService = {
      updatePresence: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    // Mock WebSocketServer
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      use: jest.fn(),
    } as unknown as typeof gateway.server;
  });

  describe('chat:message:send', () => {
    it('broadcasts chat:message:new to conversation room on success', async () => {
      const socket = makeSocket('user-1') as unknown as Parameters<
        typeof gateway.handleMessageSend
      >[0];
      const message = { id: 'msg-1', body: 'hi', conversationId: 'conv-1' };
      mockMessagesService.create.mockResolvedValue(message);

      await gateway.handleMessageSend(socket, {
        conversationId: 'conv-1',
        body: 'hi',
      });

      expect(gateway.server.to).toHaveBeenCalledWith('conversation:conv-1');
    });

    it('emits chat:error if rate limited', async () => {
      const socket = makeSocket('user-1') as unknown as Parameters<
        typeof gateway.handleMessageSend
      >[0];
      mockMessagesService.create.mockResolvedValue({ id: 'msg', body: 'hi' });

      // exhaust rate limit (10 per 10s)
      for (let i = 0; i < 10; i++) {
        await gateway.handleMessageSend(socket, {
          conversationId: 'conv-1',
          body: 'msg',
        });
      }
      (socket as unknown as MockSocket).emit.mockClear();
      await gateway.handleMessageSend(socket, {
        conversationId: 'conv-1',
        body: 'over limit',
      });

      expect((socket as unknown as MockSocket).emit).toHaveBeenCalledWith(
        'chat:error',
        expect.objectContaining({ code: 'RATE_LIMITED' }),
      );
    });
  });

  describe('chat:typing:start', () => {
    it('emits chat:typing:update to conversation room excluding sender', () => {
      const socket = makeSocket('user-1') as unknown as Parameters<
        typeof gateway.handleTypingStart
      >[0];
      const mockRoom = { emit: jest.fn() };
      (socket as unknown as MockSocket).to = jest
        .fn()
        .mockReturnValue(mockRoom);

      gateway.handleTypingStart(socket, { conversationId: 'conv-1' });

      expect((socket as unknown as MockSocket).to).toHaveBeenCalledWith(
        'conversation:conv-1',
      );
      expect(mockRoom.emit).toHaveBeenCalledWith(
        'chat:typing:update',
        expect.objectContaining({ userId: 'user-1', isTyping: true }),
      );
    });
  });

  describe('chat:board:move', () => {
    it('broadcasts chat:board:updated to conversation room', async () => {
      const socket = makeSocket('user-1') as unknown as Parameters<
        typeof gateway.handleBoardMove
      >[0];
      const updated = { id: 'conv-1', boardStatus: 'RESOLVED' };
      mockConversationsService.updateBoardStatus.mockResolvedValue(updated);

      await gateway.handleBoardMove(socket, {
        conversationId: 'conv-1',
        boardStatus: 'RESOLVED',
      });

      expect(gateway.server.to).toHaveBeenCalledWith('conversation:conv-1');
    });
  });
});
