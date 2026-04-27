import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatGateway } from '../messages/chat.gateway.js';

const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
]);
const MAX_DURATION_SECONDS = 120;

@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async upload(
    file: Express.Multer.File,
    conversationId: string,
    senderId: string,
    durationSeconds: number,
    maxSizeBytes: number,
  ): Promise<unknown> {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Invalid audio MIME type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      );
    }

    // Validate size
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size ${file.size} exceeds maximum ${maxSizeBytes} bytes`,
      );
    }

    // Validate duration
    if (!durationSeconds || durationSeconds > MAX_DURATION_SECONDS) {
      throw new BadRequestException(
        `Duration must be between 1 and ${MAX_DURATION_SECONDS} seconds`,
      );
    }

    const uploadDir = process.env['UPLOAD_DIR'] ?? './uploads';
    const convDir = path.join(uploadDir, conversationId);
    await fs.mkdir(convDir, { recursive: true });

    const fileName = `${randomUUID()}.webm`;
    const filePath = path.join(convDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    const relativePath = `/uploads/${conversationId}/${fileName}`;

    // Create message + voice recording + read statuses via transaction
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
    });

    const message = await this.prisma.$transaction(async (tx) => {
      const recording = await tx.voiceRecording.create({
        data: {
          filePath: relativePath,
          sizeBytes: file.size,
          durationSeconds: Math.round(durationSeconds),
          mimeType: file.mimetype,
        },
      });

      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId,
          type: 'VOICE',
          body: '',
          voiceRecordingId: recording.id,
          readStatuses: {
            create: participants
              .filter((p) => p.userId !== senderId)
              .map((p) => ({ userId: p.userId, status: 'DELIVERED' })),
          },
        },
        include: { sender: true, readStatuses: true, voiceRecording: true },
      });

      return msg;
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date() },
    });

    this.chatGateway.broadcastNewMessage(conversationId, message);

    return message;
  }
}
