import { Router } from 'express';
import { userController } from '@/controllers/user.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

const router = Router();

// Admin-only account management. Whole router is gated — no public routes here.
router.use(requireAuth, requireRole('admin'));

router.get('/', userController.list);
router.delete('/:id', userController.remove);

export default router;
