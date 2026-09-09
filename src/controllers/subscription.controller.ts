import { Request, Response } from 'express';
import { AppError, SubscriptionService } from '../services/subscription.service';
import { logger } from '../logger';

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { planId } = req.body;

    const result = await SubscriptionService.createSubscription(userId, planId);
    
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    logger.error({ error }, 'Unexpected error creating subscription');
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

export const getSubscription = async (req: Request, res: Response) => {
  // TODO: Phase 5 - Implement fetch logic
  res.status(200).json({
    id: req.params.id,
    status: 'ACTIVE',
  });
};
