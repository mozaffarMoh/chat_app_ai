import { Injectable } from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service.js';
import type {
  BoardStatus,
  Conversation,
} from '../../generated/prisma/index.js';

@Injectable()
export class BoardService {
  constructor(private readonly conversationsService: ConversationsService) {}

  moveCard(
    conversationId: string,
    userId: string,
    boardStatus: BoardStatus,
  ): Promise<Conversation> {
    return this.conversationsService.updateBoardStatus(
      conversationId,
      userId,
      boardStatus,
    );
  }
}
