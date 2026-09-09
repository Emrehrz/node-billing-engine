import { getClient } from '../db';
import { logger } from '../logger';
import { PlanRepository } from '../repositories/plan.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PaymentProvider } from './payment.provider';
import { AppError } from '../utils/AppError';

export const createSubscriptionService = (paymentProvider: PaymentProvider) => ({
  async createSubscription(userId: string, planId: string) {
    const plan = await PlanRepository.getPlanById(planId);
    if (!plan) {
      throw new AppError('PLAN_NOT_FOUND', 404, 'The specified plan does not exist.');
    }

    const hasActive = await SubscriptionRepository.hasActiveOrPendingSubscription(userId);
    if (hasActive) {
      throw new AppError('SUBSCRIPTION_EXISTS', 409, 'User already has an active or pending subscription.');
    }

    const paymentResult = await paymentProvider.processPayment(plan.price, plan.currency);
    
    if (!paymentResult.success) {
      throw new AppError('PAYMENT_FAILED', 402, 'The payment could not be processed.');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const subscription = await SubscriptionRepository.createSubscription(client, {
        userId,
        planId,
        status: 'ACTIVE',
      });

      const payment = await PaymentRepository.createPayment(client, {
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'SUCCEEDED',
        providerReference: paymentResult.reference || null,
      });

      await client.query('COMMIT');
      logger.info({ subscriptionId: subscription.id }, 'Subscription created successfully');

      return { subscription, payment };
    } catch (error: any) {
      await client.query('ROLLBACK');

      if (error.code === '23505' && error.constraint === 'unique_active_subscription') {
        logger.warn({ userId }, 'Concurrent subscription creation blocked by unique index');
        throw new AppError('SUBSCRIPTION_EXISTS', 409, 'User already has an active or pending subscription.');
      }

      throw error;
    } finally {
      client.release();
    }
  },
});
