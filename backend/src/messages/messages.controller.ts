import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { JwtGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/guards/jwt.guard.js';

@Controller('conversations/:conversationId/messages')
@UseGuards(JwtGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async findAll(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.messagesService.findPaginated(
      conversationId,
      user.userId,
      before,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Delete(':messageId')
  async delete(
    @Param('conversationId') _conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.messagesService.softDelete(messageId, user.userId);
  }
}
