import { verify, type JwtPayload } from 'jsonwebtoken';
import type { Socket } from 'socket.io';

export function wsAuthMiddleware(
  socket: Socket & { data: { userId?: string } },
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth['token'] as string | undefined;

  if (!token) {
    next(new Error('Unauthorized: missing token'));
    return;
  }

  try {
    const secret = process.env['JWT_ACCESS_SECRET'];
    if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');

    const payload = verify(token, secret) as JwtPayload & { sub: string };
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error('Unauthorized: invalid token'));
  }
}
