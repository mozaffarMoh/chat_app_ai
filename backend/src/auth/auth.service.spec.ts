import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as argon2 from 'argon2';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockTokenService = {
  issueTokenPair: jest.fn().mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
  }),
  invalidateRefreshToken: jest.fn().mockResolvedValue(undefined),
  rotateRefreshToken: jest.fn().mockResolvedValue({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('hashes password with argon2id and creates user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      await service.register({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.user.create.mock.calls[0][0] as {
        data: { passwordHash: string };
      };
      const hash = createCall.data.passwordHash;
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$argon2id$')).toBe(true);
      const valid = await argon2.verify(hash, 'password123');
      expect(valid).toBe(true);
    });

    it('throws 409 ConflictException on duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'taken@example.com',
          password: 'password123',
          displayName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const hash = await argon2.hash('correctpassword', {
        type: argon2.argon2id,
        memoryCost: 65540,
        timeCost: 3,
        parallelism: 4,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
    });

    it('throws 401 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws 401 on wrong password', async () => {
      const hash = await argon2.hash('correctpassword');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('delegates to tokenService.invalidateRefreshToken', async () => {
      await service.logout('user-1', 'some-refresh-token');
      expect(mockTokenService.invalidateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'some-refresh-token',
      );
    });
  });

  describe('refresh', () => {
    it('delegates to tokenService.rotateRefreshToken', async () => {
      const result = await service.refresh('old-token');
      expect(mockTokenService.rotateRefreshToken).toHaveBeenCalledWith(
        'old-token',
      );
      expect(result.accessToken).toBe('new-access');
    });
  });
});
