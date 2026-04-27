import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import { VoiceService } from './voice.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatGateway } from '../messages/chat.gateway.js';
import type { Express } from 'express';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

const makeFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File => ({
  fieldname: 'audio',
  originalname: 'test.webm',
  encoding: '7bit',
  mimetype: 'audio/webm',
  buffer: Buffer.from('fakeaudio'),
  size: 1024,
  destination: '',
  filename: '',
  path: '',
  stream: null as unknown as Express.Multer.File['stream'],
  ...overrides,
});

const mockPrisma = {
  conversationParticipant: { findMany: jest.fn() },
  message: { create: jest.fn() },
  voiceRecording: { create: jest.fn() },
  conversation: { update: jest.fn() },
  $transaction: jest.fn(),
};

const mockGateway = { broadcastNewMessage: jest.fn() };

describe('VoiceService', () => {
  let service: VoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChatGateway, useValue: mockGateway },
      ],
    }).compile();
    service = module.get<VoiceService>(VoiceService);
    jest.clearAllMocks();
  });

  describe('upload', () => {
    const MAX_SIZE = 4 * 1024 * 1024;

    it('rejects invalid MIME type', async () => {
      const file = makeFile({ mimetype: 'video/mp4' });
      await expect(
        service.upload(file, 'conv-1', 'user-1', 10, MAX_SIZE),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects files exceeding size limit', async () => {
      const file = makeFile({ size: MAX_SIZE + 1 });
      await expect(
        service.upload(file, 'conv-1', 'user-1', 10, MAX_SIZE),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duration > 120s', async () => {
      const file = makeFile();
      await expect(
        service.upload(file, 'conv-1', 'user-1', 121, MAX_SIZE),
      ).rejects.toThrow(BadRequestException);
    });

    it('saves file and creates VoiceRecording + Message on valid input', async () => {
      const file = makeFile();
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      const fakeMessage = {
        id: 'msg-1',
        type: 'VOICE',
        voiceRecording: { id: 'vr-1' },
      };
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
          fn(mockPrisma),
      );
      mockPrisma.voiceRecording.create.mockResolvedValue({ id: 'vr-1' });
      mockPrisma.message.create.mockResolvedValue(fakeMessage);
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.upload(
        file,
        'conv-1',
        'user-1',
        30,
        MAX_SIZE,
      );
      expect(result).toEqual(fakeMessage);
      expect(mockGateway.broadcastNewMessage).toHaveBeenCalledWith(
        'conv-1',
        fakeMessage,
      );
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
