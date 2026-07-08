import { Router } from 'express';
import { vehicleController } from '@/controllers/vehicle.controller';
import { validate, validateQuery } from '@/middlewares/validate';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import {
  createVehicleSchema,
  updateVehicleSchema,
  listVehiclesQuerySchema,
} from '@/validators/vehicle.validator';

const router = Router();

// Public catalog
router.get('/', validateQuery(listVehiclesQuerySchema), vehicleController.list);

// Admin management — declared before /:slug so it isn't captured by it
router.get('/all', requireAuth, requireRole('admin'), vehicleController.listAll);
router.post('/', requireAuth, requireRole('admin'), validate(createVehicleSchema), vehicleController.create);
router.patch('/:id', requireAuth, requireRole('admin'), validate(updateVehicleSchema), vehicleController.update);
router.delete('/:id', requireAuth, requireRole('admin'), vehicleController.remove);

// Public detail (keep last — matches any remaining GET /<segment>)
router.get('/:slug', vehicleController.getBySlug);

export default router;
