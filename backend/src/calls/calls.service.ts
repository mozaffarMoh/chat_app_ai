import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CallSession,
  CallStatus,
  CallType,
} from '../../generated/prisma/index.js';

type ValidTransition = Partial<Record<CallStatus, CallStatus[]>>;

const VALID_TRANSITIONS: ValidTransition = {
  RINGING: ['ACTIVE', 'DECLINED', 'MISSED'],
  ACTIVE: ['ENDED'],
};

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateCall(
    initiatorId: string,
    conversationId: string,
    recipientId: string,
    type: CallType,
  ): Promise<CallSession> {
    // Check recipient not in active call
    const recipientBusy = await this.prisma.callSession.findFirst({
      where: {
        status: { in: ['RINGING', 'ACTIVE'] },
        OR: [{ initiatorId: recipientId }, { recipientId: recipientId }],
      },
    });
    if (recipientBusy) {
      throw new ConflictException('Recipient is already in a call');
    }

    return this.prisma.callSession.create({
      data: {
        conversationId,
        type,
        status: 'RINGING',
        initiatorId,
        recipientId,
      },
    });
  }

  async updateStatus(
    callId: string,
    userId: string,
    newStatus: CallStatus,
  ): Promise<CallSession> {
    const session = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });
    if (!session) throw new NotFoundException('Call session not found');

    if (session.initiatorId !== userId && session.recipientId !== userId) {
      throw new ForbiddenException('Not a participant in this call');
    }

    const allowed = VALID_TRANSITIONS[session.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(
        `Invalid transition from ${session.status} to ${newStatus}`,
      );
    }

    return this.prisma.callSession.update({
      where: { id: callId },
      data: {
        status: newStatus,
        ...(newStatus === 'ACTIVE' ? { startedAt: new Date() } : {}),
        ...(newStatus === 'ENDED' ||
        newStatus === 'DECLINED' ||
        newStatus === 'MISSED'
          ? { endedAt: new Date() }
          : {}),
      },
    });
  }

  async getUserActiveCallSession(userId: string): Promise<CallSession | null> {
    return this.prisma.callSession.findFirst({
      where: {
        status: { in: ['RINGING', 'ACTIVE'] },
        OR: [{ initiatorId: userId }, { recipientId: userId }],
      },
    });
  }
}
