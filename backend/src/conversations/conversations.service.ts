import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  BoardStatus,
  Conversation,
} from '../../generated/prisma/index.js';
import {
  ConversationTypeDto,
  type CreateConversationDto,
} from './dto/create-conversation.dto.js';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    const allParticipantIds = Array.from(
      new Set([userId, ...dto.participantIds]),
    );

    if (dto.type === ConversationTypeDto.DIRECT) {
      if (allParticipantIds.length !== 2) {
        throw new BadRequestException(
          'Direct conversations must have exactly 2 participants',
        );
      }
      // Check uniqueness: find existing direct conversation between these two users
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: allParticipantIds.map((id) => ({
            participants: { some: { userId: id } },
          })),
        },
        include: { participants: { include: { user: true } } },
      });
      if (existing) {
        throw new ConflictException(
          'Direct conversation already exists between these users',
        );
      }
    }

    if (dto.type === ConversationTypeDto.GROUP && !dto.name) {
      throw new BadRequestException('Group conversations require a name');
    }

    return this.prisma.conversation.create({
      data: {
        type: dto.type,
        name: dto.name,
        participants: {
          create: allParticipantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: { include: { user: true } },
      },
    });
  }

  async findAllForUser(userId: string): Promise<unknown[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      orderBy: { lastActivityAt: 'desc' },
      include: {
        participants: { include: { user: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: { sender: true },
        },
      },
    });

    return Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.messageReadStatus.count({
          where: {
            userId,
            status: 'DELIVERED',
            message: { conversationId: conv.id, deletedAt: null },
          },
        });
        return {
          ...conv,
          lastMessage: conv.messages[0] ?? null,
          unreadCount,
        };
      }),
    );
  }

  async findOne(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        participants: { some: { userId } },
      },
      include: { participants: { include: { user: true } } },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async updateBoardStatus(
    id: string,
    userId: string,
    boardStatus: BoardStatus,
  ): Promise<Conversation> {
    await this.findOne(id, userId);
    return this.prisma.conversation.update({
      where: { id },
      data: { boardStatus },
      include: { participants: { include: { user: true } } },
    });
  }
}
