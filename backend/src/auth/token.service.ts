import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sign, verify, type JwtPayload } from 'jsonwebtoken';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  issueAccessToken(userId: string, email: string): string {
    const secret = process.env['JWT_ACCESS_SECRET'];
    if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');
    const expiresIn = (process.env['JWT_ACCESS_EXPIRES_IN'] ??
      '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`;
    return sign({ sub: userId, email }, secret, { expiresIn });
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const secret = process.env['JWT_REFRESH_SECRET'];
    if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
    const expiresIn = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';

    const token = sign({ sub: userId }, secret, {
      expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    const days = parseInt(expiresIn.replace(/\D/g, ''), 10);
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshTokenSession.create({
      data: { userId, tokenHash, expiresAt },
    });

    return token;
  }

  async issueTokenPair(userId: string, email: string): Promise<TokenPair> {
    const accessToken = this.issueAccessToken(userId, email);
    const refreshToken = await this.issueRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  async invalidateRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.refreshTokenSession.updateMany({
      where: { userId, tokenHash, isValid: true },
      data: { isValid: false },
    });
  }

  async rotateRefreshToken(oldToken: string): Promise<TokenPair> {
    const secret = process.env['JWT_REFRESH_SECRET'];
    if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');

    let payload: JwtPayload & { sub: string };
    try {
      payload = verify(oldToken, secret) as JwtPayload & { sub: string };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = createHash('sha256').update(oldToken).digest('hex');
    const session = await this.prisma.refreshTokenSession.findUnique({
      where: { tokenHash },
    });

    if (!session || !session.isValid || session.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token invalid or reused');
    }

    await this.prisma.refreshTokenSession.update({
      where: { id: session.id },
      data: { isValid: false },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });

    return this.issueTokenPair(user.id, user.email);
  }
}
