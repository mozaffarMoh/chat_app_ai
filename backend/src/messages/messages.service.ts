import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Message } from '../../generated/prisma/index.js';

interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
}

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(
    conversationId: string,
    _userId: string,
    before?: string,
    limit = 50,
  ): Promise<PaginatedMessages> {
    const take = Math.min(limit, 100);
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(before ? { sentAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: take + 1,
      include: {
        sender: true,
        readStatuses: true,
        voiceRecording: true,
      },
    });

    const hasMore = messages.length > take;
    return {
      messages: messages.slice(0, take).reverse(),
      hasMore,
    };
  }

  async create(
    conversationId: string,
    senderId: string,
    body: string,
  ): Promise<Message> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: 'TEXT',
        body,
        readStatuses: {
          create: participants
            .filter((p) => p.userId !== senderId)
            .map((p) => ({ userId: p.userId, status: 'DELIVERED' })),
        },
      },
      include: {
        sender: true,
        readStatuses: true,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date() },
    });

    return message;
  }

  async markRead(
    conversationId: string,
    userId: string,
    upToMessageId: string,
  ): Promise<void> {
    const message = await this.prisma.message.findFirst({
      where: { id: upToMessageId, conversationId },
    });
    if (!message) throw new NotFoundException('Message not found');

    await this.prisma.messageReadStatus.updateMany({
      where: {
        userId,
        status: 'DELIVERED',
        message: {
          conversationId,
          sentAt: { lte: message.sentAt },
        },
      },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  async softDelete(messageId: string, userId: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new ForbiddenException("Cannot delete another user's message");

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: { sender: true, readStatuses: true },
    });
  }
}
