import { Test, type TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CallsService } from './calls.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockSession = {
  id: 'call-1',
  initiatorId: 'user-1',
  recipientId: 'user-2',
  conversationId: 'conv-1',
  type: 'VIDEO',
  status: 'RINGING',
  startedAt: null,
  endedAt: null,
};

const mockPrisma = {
  callSession: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('CallsService', () => {
  let service: CallsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CallsService>(CallsService);
    jest.clearAllMocks();
  });

  describe('initiateCall', () => {
    it('creates a RINGING call session', async () => {
      mockPrisma.callSession.findFirst.mockResolvedValue(null);
      mockPrisma.callSession.create.mockResolvedValue(mockSession);

      const result = await service.initiateCall(
        'user-1',
        'conv-1',
        'user-2',
        'VIDEO',
      );
      expect(result.status).toBe('RINGING');
    });

    it('throws 409 when recipient is already in a call', async () => {
      mockPrisma.callSession.findFirst.mockResolvedValue(mockSession);
      await expect(
        service.initiateCall('user-1', 'conv-1', 'user-2', 'VIDEO'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('transitions RINGING → ACTIVE and sets startedAt', async () => {
      mockPrisma.callSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.callSession.update.mockResolvedValue({
        ...mockSession,
        status: 'ACTIVE',
      });

      const result = await service.updateStatus('call-1', 'user-2', 'ACTIVE');
      expect(result.status).toBe('ACTIVE');
    });

    it('throws 409 for invalid transition RINGING → ENDED', async () => {
      mockPrisma.callSession.findUnique.mockResolvedValue(mockSession);
      await expect(
        service.updateStatus('call-1', 'user-1', 'ENDED'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 404 if call not found', async () => {
      mockPrisma.callSession.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('call-x', 'user-1', 'ACTIVE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 403 if user is not a participant', async () => {
      mockPrisma.callSession.findUnique.mockResolvedValue(mockSession);
      await expect(
        service.updateStatus('call-1', 'user-99', 'ACTIVE'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserActiveCallSession', () => {
    it('returns active session for user', async () => {
      mockPrisma.callSession.findFirst.mockResolvedValue(mockSession);
      const result = await service.getUserActiveCallSession('user-1');
      expect(result).toEqual(mockSession);
    });

    it('returns null when user has no active session', async () => {
      mockPrisma.callSession.findFirst.mockResolvedValue(null);
      const result = await service.getUserActiveCallSession('user-1');
      expect(result).toBeNull();
    });
  });
});
