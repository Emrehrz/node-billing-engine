import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { FakePaymentProvider } from '../src/services/payment.provider';

describe('Subscription API', () => {
  const user1 = { email: 'sub1@example.com', password: 'password123' };
  const user2 = { email: 'sub2@example.com', password: 'password123' };

  let token1: string;
  let token2: string;
  let userId1: string;
  let userId2: string;

  // The plan IDs seeded in setup.ts
  const validPlanId = '00d6a617-d60e-4353-baaa-f95d2ef0852c';

  beforeEach(async () => {
    // Mock the payment provider to succeed by default for all tests
    vi.spyOn(FakePaymentProvider, 'processPayment').mockResolvedValue({
      success: true,
      reference: 'fake_txn_test'
    });

    // Register and login users to get tokens
    const r1 = await request(app).post('/auth/register').send(user1);
    userId1 = r1.body.id;
    const l1 = await request(app).post('/auth/login').send(user1);
    token1 = l1.body.accessToken;

    const r2 = await request(app).post('/auth/register').send(user2);
    userId2 = r2.body.id;
    const l2 = await request(app).post('/auth/login').send(user2);
    token2 = l2.body.accessToken;
  });

  describe('Authorization', () => {
    it('should return 401 if JWT is missing', async () => {
      const res = await request(app).post('/subscriptions').send({ planId: validPlanId });
      expect(res.status).toBe(401);
    });

    it('should return 401 if JWT is invalid', async () => {
      const res = await request(app)
        .post('/subscriptions')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ planId: validPlanId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /subscriptions', () => {
    it('should return 400 for invalid planId format', async () => {
      const res = await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ planId: 'not-a-uuid' });
      expect(res.status).toBe(400);
    });

    it('should return 404 for nonexistent plan', async () => {
      const res = await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ planId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PLAN_NOT_FOUND');
    });

    it('should successfully create a subscription and payment', async () => {
      const res = await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ planId: validPlanId });

      expect(res.status).toBe(201);
      expect(res.body.subscription.status).toBe('ACTIVE');
      expect(res.body.subscription.user_id).toBe(userId1);
      expect(res.body.payment.status).toBe('SUCCEEDED');
    });

    it('should return 409 for duplicate active subscription', async () => {
      // Create first subscription
      await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ planId: validPlanId });

      // Attempt duplicate
      const res = await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ planId: validPlanId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SUBSCRIPTION_EXISTS');
    });

    it('should handle payment failure and rollback database', async () => {
      // Mock the payment provider to fail
      const processPaymentSpy = vi.spyOn(FakePaymentProvider, 'processPayment');
      processPaymentSpy.mockResolvedValueOnce({ success: false });

      const res = await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${token2}`)
        .send({ planId: validPlanId });

      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('PAYMENT_FAILED');

      // Verify rollback by checking the user still has NO active subscription
      // A subsequent successful attempt should pass (not 409) if rollback worked
      processPaymentSpy.mockResolvedValueOnce({
        success: true,
        reference: 'fake_txn_test'
      });

      const retryRes = await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${token2}`)
        .send({ planId: validPlanId });

      expect(retryRes.status).toBe(201);
    });
  });

  describe('GET /subscriptions/:id', () => {
    it('should return 200 for owner and 403 for non-owner', async () => {
      // We'll create a completely fresh user for this test to be safe
      const owner = { email: 'owner@example.com', password: 'password123' };
      const intruder = { email: 'intruder@example.com', password: 'password123' };

      await request(app).post('/auth/register').send(owner);
      const ownerToken = (await request(app).post('/auth/login').send(owner)).body.accessToken;

      await request(app).post('/auth/register').send(intruder);
      const intruderToken = (await request(app).post('/auth/login').send(intruder)).body.accessToken;

      // Owner creates sub
      const createRes = await request(app)
        .post('/subscriptions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ planId: validPlanId });

      expect(createRes.status).toBe(201);
      const newSubId = createRes.body.subscription.id;

      // Owner fetches
      const getRes = await request(app)
        .get(`/subscriptions/${newSubId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(newSubId);

      // Intruder fetches
      const intruderRes = await request(app)
        .get(`/subscriptions/${newSubId}`)
        .set('Authorization', `Bearer ${intruderToken}`);

      expect(intruderRes.status).toBe(403);
      expect(intruderRes.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for nonexistent subscription', async () => {
      const res = await request(app)
        .get(`/subscriptions/f47ac10b-58cc-4372-a567-0e02b2c3d479`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
    });
  });
});
