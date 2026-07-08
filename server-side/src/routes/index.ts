import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';
import vehicleRoutes from '@/routes/vehicle.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'OK' } });
});

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);

export default router;
