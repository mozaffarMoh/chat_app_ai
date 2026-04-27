import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { VoiceModule } from './voice/voice.module.js';
import { CallsModule } from './calls/calls.module.js';
import { CleanupService } from './common/tasks/cleanup.service.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    VoiceModule,
    CallsModule,
  ],
  controllers: [AppController],
  providers: [AppService, CleanupService],
})
export class AppModule {}
