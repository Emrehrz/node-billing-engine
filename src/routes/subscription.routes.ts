import { Router } from 'express';
import { validate } from '../middleware/validate';
import { createSubscriptionSchema, getSubscriptionSchema } from '../schemas/subscription.schema';
import { createSubscription, getSubscription } from '../controllers/subscription.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.post('/', validate(createSubscriptionSchema), createSubscription);
router.get('/:id', validate(getSubscriptionSchema), getSubscription);

export default router;
