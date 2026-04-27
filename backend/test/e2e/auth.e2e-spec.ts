import 'dotenv/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module.js';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const uniqueEmail = `e2e-${Date.now()}@example.com`;
  let cookies: string[] = [];

  describe('POST /auth/register', () => {
    it('registers a new user and sets cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          displayName: 'E2E User',
        })
        .expect(201);

      expect(res.body.data.message).toBe('Registered successfully');
      const setCookie = res.headers['set-cookie'] as
        | string
        | string[]
        | undefined;
      expect(setCookie).toBeDefined();
      cookies = Array.isArray(setCookie) ? setCookie : [setCookie as string];
      expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('returns 409 on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          displayName: 'Dup',
        })
        .expect(409);
    });

    it('returns 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'short', displayName: '' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in and sets cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'password123' })
        .expect(200);

      const setCookie = res.headers['set-cookie'] as
        | string
        | string[]
        | undefined;
      cookies = Array.isArray(setCookie) ? setCookie : [setCookie as string];
      expect(res.body.data.message).toBe('Logged in successfully');
    });

    it('returns 401 on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'wrongpass' })
        .expect(401);
    });
  });

  describe('GET /users/me', () => {
    it('returns current user when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.data.email).toBe(uniqueEmail);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('returns 401 without cookie', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears cookies on logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      const setCookie = res.headers['set-cookie'] as string[] | undefined;
      expect(setCookie?.some((c) => c.includes('accessToken=;'))).toBe(true);
    });
  });
});
