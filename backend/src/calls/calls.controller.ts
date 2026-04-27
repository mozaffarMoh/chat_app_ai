import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsString } from 'class-validator';
import { CallsService } from './calls.service.js';
import { JwtGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/guards/jwt.guard.js';
import { CallStatus, CallType } from '../../generated/prisma/index.js';

class InitiateCallDto {
  @IsEnum(CallType)
  type!: CallType;
  @IsString()
  recipientId!: string;
}

class UpdateCallStatusDto {
  @IsEnum(CallStatus)
  status!: CallStatus;
}

@Controller('conversations/:conversationId/calls')
@UseGuards(JwtGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  async initiate(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitiateCallDto,
  ): Promise<unknown> {
    return this.callsService.initiateCall(
      user.userId,
      conversationId,
      dto.recipientId,
      dto.type,
    );
  }

  @Patch(':callId/status')
  async updateStatus(
    @Param('callId') callId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCallStatusDto,
  ): Promise<unknown> {
    return this.callsService.updateStatus(callId, user.userId, dto.status);
  }

  @Get('active')
  async getActive(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.callsService.getUserActiveCallSession(user.userId);
  }
}
