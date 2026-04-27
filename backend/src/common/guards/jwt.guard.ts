import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verify, type JwtPayload } from 'jsonwebtoken';
import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const token = request.cookies['accessToken'] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const secret = process.env['JWT_ACCESS_SECRET'];
      if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');

      const payload = verify(token, secret) as JwtPayload & {
        sub: string;
        email: string;
      };

      request.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
