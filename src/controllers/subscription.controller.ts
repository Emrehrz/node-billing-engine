import { Request, Response } from 'express';
import { createSubscriptionService } from '../services/subscription.service';
import { FakePaymentProvider } from '../services/payment.provider';
import { asyncHandler } from '../utils/asyncHandler';

const subscriptionService = createSubscriptionService(FakePaymentProvider);

export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { planId } = req.body;

  const result = await subscriptionService.createSubscription(userId, planId);
  
  res.status(201).json(result);
});

export const getSubscription = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Phase 5 - Implement fetch logic
  res.status(200).json({
    id: req.params.id,
    status: 'ACTIVE',
  });
});
