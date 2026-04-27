import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredSessions(): Promise<void> {
    const result = await this.prisma.refreshTokenSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isValid: false },
        ],
      },
    });
    this.logger.log(`Cleaned up ${result.count} expired/invalid refresh token sessions`);
  }
}
