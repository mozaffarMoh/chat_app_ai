import { Test, type TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  type: 'TEXT',
  body: 'Hello',
  deletedAt: null,
  sentAt: new Date('2024-01-01T00:00:00Z'),
  sender: { id: 'user-1', displayName: 'Alice' },
  readStatuses: [],
  voiceRecording: null,
};

const mockPrisma = {
  message: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  messageReadStatus: {
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  conversationParticipant: {
    findMany: jest.fn(),
  },
  conversation: {
    update: jest.fn(),
  },
};

describe('MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    jest.clearAllMocks();
  });

  describe('findPaginated', () => {
    it('returns messages in ascending order', async () => {
      mockPrisma.message.findMany.mockResolvedValue([mockMessage]);
      const result = await service.findPaginated('conv-1', 'user-1');
      expect(result.messages).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('indicates hasMore when over limit', async () => {
      const messages = Array.from({ length: 51 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
      }));
      mockPrisma.message.findMany.mockResolvedValue(messages);
      const result = await service.findPaginated(
        'conv-1',
        'user-1',
        undefined,
        50,
      );
      expect(result.hasMore).toBe(true);
      expect(result.messages).toHaveLength(50);
    });
  });

  describe('create', () => {
    it('creates a message and updates conversation lastActivityAt', async () => {
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.create('conv-1', 'user-1', 'Hello');
      expect(result).toEqual(mockMessage);
      expect(mockPrisma.conversation.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('markRead', () => {
    it('marks messages as read up to given message', async () => {
      mockPrisma.message.findFirst.mockResolvedValue(mockMessage);
      mockPrisma.messageReadStatus.updateMany.mockResolvedValue({ count: 3 });

      await service.markRead('conv-1', 'user-1', 'msg-1');
      expect(mockPrisma.messageReadStatus.updateMany).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException if message not found', async () => {
      mockPrisma.message.findFirst.mockResolvedValue(null);
      await expect(
        service.markRead('conv-1', 'user-1', 'msg-x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('soft deletes message owned by user', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue({
        ...mockMessage,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('msg-1', 'user-1');
      expect(result.deletedAt).toBeTruthy();
    });

    it('throws NotFoundException when message missing', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      await expect(service.softDelete('msg-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is not sender', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        ...mockMessage,
        senderId: 'user-2',
      });
      await expect(service.softDelete('msg-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
