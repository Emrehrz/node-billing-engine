import { getClient } from '../db';
import { logger } from '../logger';
import { PlanRepository } from '../repositories/plan.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { FakePaymentProvider } from './payment.provider';

export class AppError extends Error {
  constructor(public code: string, public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const SubscriptionService = {
  async createSubscription(userId: string, planId: string) {
    // 1. Verify plan exists
    const plan = await PlanRepository.getPlanById(planId);
    if (!plan) {
      throw new AppError('PLAN_NOT_FOUND', 404, 'The specified plan does not exist.');
    }

    // 2. Check for existing PENDING or ACTIVE subscription
    const hasActive = await SubscriptionRepository.hasActiveOrPendingSubscription(userId);
    if (hasActive) {
      throw new AppError('SUBSCRIPTION_EXISTS', 409, 'User already has an active or pending subscription.');
    }

    // 3. Process payment through external provider (outside of DB transaction)
    const paymentResult = await FakePaymentProvider.processPayment(plan.price, plan.currency);
    
    // If payment fails, we stop here. We don't even create the subscription.
    // Alternatively, we could create it as 'PENDING' and payment as 'FAILED', but
    // the requirement says: "If payment fails, handled safely." It's cleaner to reject.
    if (!paymentResult.success) {
      throw new AppError('PAYMENT_FAILED', 402, 'The payment could not be processed.');
    }

    // 4. Database Transaction
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 5. Create Subscription
      const subscription = await SubscriptionRepository.createSubscription(client, {
        userId,
        planId,
        status: 'ACTIVE',
      });

      // 6. Create Payment
      const payment = await PaymentRepository.createPayment(client, {
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'SUCCEEDED',
        providerReference: paymentResult.reference || null,
      });

      // 7. Commit
      await client.query('COMMIT');
      logger.info({ subscriptionId: subscription.id }, 'Subscription created successfully');

      return { subscription, payment };
    } catch (error: any) {
      // Rollback on any failure
      await client.query('ROLLBACK');

      // 8. Handle concurrent duplicate subscription constraint violation
      // PostgreSQL error code 23505 = unique_violation
      if (error.code === '23505' && error.constraint === 'unique_active_subscription') {
        logger.warn({ userId }, 'Concurrent subscription creation blocked by unique index');
        throw new AppError('SUBSCRIPTION_EXISTS', 409, 'User already has an active or pending subscription.');
      }

      // Re-throw unexpected errors
      throw error;
    } finally {
      client.release();
    }
  },
};
