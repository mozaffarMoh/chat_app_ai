import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, type Socket } from 'socket.io';
import { wsAuthMiddleware } from '../common/guards/ws-auth.guard.js';
import { CallsService } from './calls.service.js';

type AuthSocket = Socket & { data: { userId: string } };

interface InitiateCallPayload {
  callId: string;
  recipientId: string;
  callType: 'AUDIO' | 'VIDEO';
  conversationId: string;
}

interface SignalPayload {
  callId: string;
  recipientUserId: string;
  signal: unknown;
}

interface CallActionPayload {
  callId: string;
}

// Map userId → socketId for routing
const userSocketMap = new Map<string, string>();

@WebSocketGateway({
  namespace: '/calls',
  cors: { origin: process.env['CORS_ORIGIN'], credentials: true },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly callsService: CallsService) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      wsAuthMiddleware(socket as AuthSocket, next);
    });
  }

  handleConnection(socket: AuthSocket): void {
    const userId = socket.data.userId;
    if (userId) {
      userSocketMap.set(userId, socket.id);
      void socket.join(`user:${userId}`);
    }
  }

  handleDisconnect(socket: AuthSocket): void {
    const userId = socket.data.userId;
    if (userId) {
      userSocketMap.delete(userId);
      // If in active call, notify the other party
      void this.callsService
        .getUserActiveCallSession(userId)
        .then((session) => {
          if (!session) return;
          const otherId =
            session.initiatorId === userId
              ? session.recipientId
              : session.initiatorId;
          this.server
            .to(`user:${otherId}`)
            .emit('call:ended', { callId: session.id });
          void this.callsService
            .updateStatus(session.id, userId, 'ENDED')
            .catch(() => {});
        });
    }
  }

  @SubscribeMessage('call:initiate')
  handleInitiate(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: InitiateCallPayload,
  ): void {
    const initiatorId = socket.data.userId;
    // REST endpoint already verified recipient availability; just forward the notification
    this.server.to(`user:${data.recipientId}`).emit('call:incoming', {
      callId: data.callId,
      initiatorId,
      callType: data.callType,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('call:accepted')
  handleAccepted(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { callId: string; initiatorId: string },
  ): void {
    const acceptorId = socket.data.userId;
    // Emit to caller immediately — signaling must not block on DB
    this.server.to(`user:${data.initiatorId}`).emit('call:accepted', {
      callId: data.callId,
      acceptorId,
    });
    // Update DB status in the background (non-blocking)
    void this.callsService
      .updateStatus(data.callId, acceptorId, 'ACTIVE')
      .catch(() => {});
  }

  @SubscribeMessage('call:declined')
  handleDeclined(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { callId: string; initiatorId: string },
  ): void {
    this.server
      .to(`user:${data.initiatorId}`)
      .emit('call:declined', { callId: data.callId });
    void this.callsService
      .updateStatus(data.callId, socket.data.userId, 'DECLINED')
      .catch(() => {});
  }

  @SubscribeMessage('call:ended')
  handleEnded(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: CallActionPayload & { recipientId: string },
  ): void {
    this.server
      .to(`user:${data.recipientId}`)
      .emit('call:ended', { callId: data.callId });
    void this.callsService
      .updateStatus(data.callId, socket.data.userId, 'ENDED')
      .catch(() => {});
  }

  @SubscribeMessage('call:signal')
  handleSignal(@MessageBody() data: SignalPayload): void {
    // Relay WebRTC signal via the recipient's user room (avoids needing socket IDs on clients)
    this.server.to(`user:${data.recipientUserId}`).emit('call:signal', {
      callId: data.callId,
      signal: data.signal,
    });
  }
}
