import { verify, type JwtPayload } from 'jsonwebtoken';
import type { Socket } from 'socket.io';

function parseCookieToken(cookieHeader: string): string | undefined {
  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : undefined;
}

export function wsAuthMiddleware(
  socket: Socket & { data: { userId?: string } },
  next: (err?: Error) => void,
): void {
  // Prefer cookie-based auth (httpOnly cookie set by /auth/login)
  // Fall back to socket.handshake.auth.token for non-browser clients
  const cookieHeader = socket.handshake.headers.cookie ?? '';
  const token =
    parseCookieToken(cookieHeader) ??
    (socket.handshake.auth['token'] as string | undefined);

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
