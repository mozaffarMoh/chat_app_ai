import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service.js';
import { VoiceController } from './voice.controller.js';
import { MessagesModule } from '../messages/messages.module.js';

@Module({
  imports: [MessagesModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
