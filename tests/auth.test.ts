import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Auth API', () => {
  const validUser = {
    email: 'test@example.com',
    password: 'supersecurepassword',
  };

  describe('POST /auth/register', () => {
    it('should successfully register a user and not return the password hash', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('created_at');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('password_hash');
    });

    it('should return 409 Conflict for duplicate emails', async () => {
      // First registration works
      await request(app).post('/auth/register').send(validUser);
      
      // Second fails
      const res = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should fail validation with 400 for invalid email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail validation with 400 for short passwords', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test2@example.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('should successfully login and return a JWT', async () => {
      await request(app).post('/auth/register').send(validUser);

      const res = await request(app)
        .post('/auth/login')
        .send(validUser);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(validUser.email);
      
      // Ensure it's a JWT (starts with ey)
      expect(res.body.accessToken).toMatch(/^eyJ/);
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      await request(app).post('/auth/register').send(validUser);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: validUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for nonexistent user', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
