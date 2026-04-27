import { Module } from '@nestjs/common';
import { CallsService } from './calls.service.js';
import { CallsController } from './calls.controller.js';
import { CallsGateway } from './calls.gateway.js';

@Module({
  controllers: [CallsController],
  providers: [CallsService, CallsGateway],
  exports: [CallsService],
})
export class CallsModule {}
