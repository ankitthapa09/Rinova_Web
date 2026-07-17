import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';
import vehicleRoutes from '@/routes/vehicle.routes';
import uploadRoutes from '@/routes/upload.routes';
import userRoutes from '@/routes/user.routes';
import bookingRoutes from '@/routes/booking.routes';
import washOrderRoutes from '@/routes/washOrder.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'OK' } });
});

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/uploads', uploadRoutes);
router.use('/users', userRoutes);
router.use('/bookings', bookingRoutes);
router.use('/wash', washOrderRoutes);

export default router;
