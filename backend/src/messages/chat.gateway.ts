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
import { MessagesService } from './messages.service.js';
import { ConversationsService } from '../conversations/conversations.service.js';
import { UsersService } from '../users/users.service.js';

type AuthSocket = Socket & { data: { userId: string } };

interface MessageSendPayload {
  conversationId: string;
  body: string;
}

interface MessageReadPayload {
  conversationId: string;
  upToMessageId: string;
}

interface TypingPayload {
  conversationId: string;
}

interface BoardMovePayload {
  conversationId: string;
  boardStatus: string;
}

// Rate limiter: tracks per-socket per-event window
class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  isAllowed(key: string, maxCount: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);
    if (!entry || now > entry.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxCount) return false;
    entry.count += 1;
    return true;
  }
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly messageLimiter = new RateLimiter();
  private readonly typingLimiter = new RateLimiter();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      wsAuthMiddleware(socket as AuthSocket, next);
    });
  }

  async handleConnection(socket: AuthSocket): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;

    // Join personal room
    await socket.join(`user:${userId}`);
    await this.usersService.updatePresence(userId, 'ONLINE');

    // Notify conversations about presence
    const conversations =
      await this.conversationsService.findAllForUser(userId);
    for (const conv of conversations as { id: string }[]) {
      this.server.to(`conversation:${conv.id}`).emit('chat:presence:update', {
        userId,
        status: 'ONLINE',
        conversationId: conv.id,
      });
    }
  }

  async handleDisconnect(socket: AuthSocket): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;

    await this.usersService.updatePresence(userId, 'OFFLINE');

    const conversations =
      await this.conversationsService.findAllForUser(userId);
    for (const conv of conversations as { id: string }[]) {
      this.server.to(`conversation:${conv.id}`).emit('chat:presence:update', {
        userId,
        status: 'OFFLINE',
        conversationId: conv.id,
      });
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    await socket.join(`conversation:${data.conversationId}`);
    socket.emit('chat:joined', { conversationId: data.conversationId });
  }

  @SubscribeMessage('chat:leave')
  async handleLeave(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    await socket.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('chat:message:send')
  async handleMessageSend(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: MessageSendPayload,
  ): Promise<void> {
    const userId = socket.data.userId;
    // Rate limit: 10 messages / 10 s
    if (!this.messageLimiter.isAllowed(`msg:${socket.id}`, 10, 10_000)) {
      socket.emit('chat:error', {
        code: 'RATE_LIMITED',
        message: 'Too many messages',
      });
      return;
    }

    try {
      const message = await this.messagesService.create(
        data.conversationId,
        userId,
        data.body,
      );
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('chat:message:new', message);
    } catch (err) {
      socket.emit('chat:error', { code: 'SEND_FAILED', message: String(err) });
    }
  }

  @SubscribeMessage('chat:message:read')
  async handleMessageRead(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: MessageReadPayload,
  ): Promise<void> {
    const userId = socket.data.userId;
    try {
      await this.messagesService.markRead(
        data.conversationId,
        userId,
        data.upToMessageId,
      );
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('chat:message:status', {
          conversationId: data.conversationId,
          upToMessageId: data.upToMessageId,
          userId,
          status: 'READ',
        });
    } catch {
      // silent failure for read receipts
    }
  }

  @SubscribeMessage('chat:typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: TypingPayload,
  ): void {
    const userId = socket.data.userId;
    // Rate limit: 1 event / 300 ms per socket per conversation
    if (
      !this.typingLimiter.isAllowed(
        `typing:${socket.id}:${data.conversationId}`,
        1,
        300,
      )
    ) {
      return;
    }
    socket
      .to(`conversation:${data.conversationId}`)
      .emit('chat:typing:update', {
        userId,
        conversationId: data.conversationId,
        isTyping: true,
      });
  }

  @SubscribeMessage('chat:typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: TypingPayload,
  ): void {
    const userId = socket.data.userId;
    socket
      .to(`conversation:${data.conversationId}`)
      .emit('chat:typing:update', {
        userId,
        conversationId: data.conversationId,
        isTyping: false,
      });
  }

  @SubscribeMessage('chat:board:move')
  async handleBoardMove(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: BoardMovePayload,
  ): Promise<void> {
    const userId = socket.data.userId;
    try {
      const updated = await this.conversationsService.updateBoardStatus(
        data.conversationId,
        userId,
        data.boardStatus as 'ACTIVE' | 'AWAITING_REPLY' | 'RESOLVED',
      );
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('chat:board:updated', updated);
    } catch (err) {
      socket.emit('chat:error', {
        code: 'BOARD_MOVE_FAILED',
        message: String(err),
      });
    }
  }

  // Called by VoiceService to broadcast new voice messages
  broadcastNewMessage(conversationId: string, message: unknown): void {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('chat:message:new', message);
  }
}
