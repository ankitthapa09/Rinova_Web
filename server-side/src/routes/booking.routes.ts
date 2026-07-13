import { Router } from 'express';
import { bookingController } from '@/controllers/booking.controller';
import { validate } from '@/middlewares/validate';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import { createBookingSchema, updateBookingStatusSchema } from '@/validators/booking.validator';

const router = Router();

// Everything about bookings involves an identity — no anonymous routes.
router.use(requireAuth);

// Customer
router.post('/', validate(createBookingSchema), bookingController.create);
router.get('/mine', bookingController.listMine);
router.patch('/:id/cancel', bookingController.cancel);

// Admin
router.get('/', requireRole('admin'), bookingController.listAll);
router.patch(
  '/:id/status',
  requireRole('admin'),
  validate(updateBookingStatusSchema),
  bookingController.updateStatus,
);

export default router;
