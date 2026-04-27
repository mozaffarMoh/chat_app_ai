import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { VoiceService } from './voice.service.js';
import { JwtGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/guards/jwt.guard.js';

const MAX_SIZE = parseInt(process.env['MAX_VOICE_SIZE_BYTES'] ?? '4194304', 10);

@Controller('conversations/:conversationId/messages/voice')
@UseGuards(JwtGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async upload(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('durationSeconds') durationStr: string,
  ): Promise<unknown> {
    if (!file) throw new BadRequestException('No audio file provided');
    const durationSeconds = parseFloat(durationStr);
    if (isNaN(durationSeconds))
      throw new BadRequestException('durationSeconds is required');
    return this.voiceService.upload(
      file,
      conversationId,
      user.userId,
      durationSeconds,
      MAX_SIZE,
    );
  }
}
