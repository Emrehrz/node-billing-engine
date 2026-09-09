import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  body: z.object({
    planId: z.string().uuid('Must be a valid UUID'),
  }),
});

export const getSubscriptionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Must be a valid UUID'),
  }),
});
