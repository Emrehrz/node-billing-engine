import { Router } from 'express';
import { validate } from '../middleware/validate';
import { createSubscriptionSchema, getSubscriptionSchema } from '../schemas/subscription.schema';
import { createSubscription, getSubscription } from '../controllers/subscription.controller';
import { requireAuthMock } from '../middleware/auth';

const router = Router();

// Conceptually protected routes (Authentication middleware will be added in Phase 6)
router.use(requireAuthMock);
router.post('/', validate(createSubscriptionSchema), createSubscription);
router.get('/:id', validate(getSubscriptionSchema), getSubscription);

export default router;
