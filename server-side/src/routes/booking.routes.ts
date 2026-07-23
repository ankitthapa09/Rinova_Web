import { Router } from 'express';
import { bookingController } from '@/controllers/booking.controller';
import { validate } from '@/middlewares/validate';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import { createBookingSchema, updateBookingStatusSchema } from '@/validators/booking.validator';

const router = Router();

// Everything about bookings involves an identity — no anonymous routes.
router.use(requireAuth);

// Customer — only real customers rent vehicles; admins manage the fleet, so
// they can't book (not even their own vehicles).
router.post('/', requireRole('user'), validate(createBookingSchema), bookingController.create);
router.get('/mine', requireRole('user'), bookingController.listMine);
router.patch('/:id/cancel', requireRole('user'), bookingController.cancel);

// Admin
router.get('/', requireRole('admin'), bookingController.listAll);
router.patch(
  '/:id/status',
  requireRole('admin'),
  validate(updateBookingStatusSchema),
  bookingController.updateStatus,
);

export default router;
