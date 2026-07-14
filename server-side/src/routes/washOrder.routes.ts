import { Router } from 'express';
import { washOrderController } from '@/controllers/washOrder.controller';
import { validate, validateQuery } from '@/middlewares/validate';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import {
  createWashOrderSchema,
  updateWashOrderStatusSchema,
  washAvailabilityQuerySchema,
} from '@/validators/washOrder.validator';

const router = Router();

// Public — the landing page prices washes and shows free slots before anyone logs in.
router.get('/packages', washOrderController.catalogue);
router.get(
  '/availability',
  validateQuery(washAvailabilityQuerySchema),
  washOrderController.availability,
);

// Everything past here is tied to an identity.
router.use(requireAuth);

// Customer
router.post('/orders', validate(createWashOrderSchema), washOrderController.create);
router.get('/orders/mine', washOrderController.listMine);
router.patch('/orders/:id/cancel', washOrderController.cancel);

// Admin
router.get('/orders', requireRole('admin'), washOrderController.listAll);
router.patch(
  '/orders/:id/status',
  requireRole('admin'),
  validate(updateWashOrderStatusSchema),
  washOrderController.updateStatus,
);

export default router;
