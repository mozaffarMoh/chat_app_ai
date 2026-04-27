import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { ConversationsModule } from '../conversations/conversations.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [ConversationsModule, UsersModule],
  controllers: [MessagesController],
  providers: [MessagesService, ChatGateway],
  exports: [MessagesService, ChatGateway],
})
export class MessagesModule {}
