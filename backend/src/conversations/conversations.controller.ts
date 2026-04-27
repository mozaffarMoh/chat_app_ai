import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { UpdateBoardStatusDto } from './dto/update-board-status.dto.js';
import { JwtGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/guards/jwt.guard.js';

@Controller('conversations')
@UseGuards(JwtGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<unknown[]> {
    return this.conversationsService.findAllForUser(user.userId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<unknown> {
    return this.conversationsService.create(user.userId, dto);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.conversationsService.findOne(id, user.userId);
  }

  @Patch(':id/board-status')
  async updateBoardStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBoardStatusDto,
  ): Promise<unknown> {
    return this.conversationsService.updateBoardStatus(
      id,
      user.userId,
      dto.boardStatus,
    );
  }
}
