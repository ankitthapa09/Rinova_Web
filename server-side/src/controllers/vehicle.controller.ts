import type { Request, Response } from 'express';
import { vehicleService } from '@/services/vehicle.service';
import { catchAsync } from '@/utils/catchAsync';
import type { ListVehiclesQuery } from '@/validators/vehicle.validator';

export const vehicleController = {
  // Public

  list: catchAsync(async (_req: Request, res: Response) => {
    const { category } = res.locals.query as ListVehiclesQuery;
    const vehicles = await vehicleService.list(category);
    res.status(200).json({ success: true, data: { vehicles } });
  }),

  getBySlug: catchAsync(async (req: Request, res: Response) => {
    const vehicle = await vehicleService.getBySlug(String(req.params.slug));
    res.status(200).json({ success: true, data: { vehicle } });
  }),

  // Admin

  listAll: catchAsync(async (_req: Request, res: Response) => {
    const vehicles = await vehicleService.listAll();
    res.status(200).json({ success: true, data: { vehicles } });
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    const vehicle = await vehicleService.create(req.body);
    res.status(201).json({ success: true, data: { vehicle } });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const vehicle = await vehicleService.update(String(req.params.id), req.body);
    res.status(200).json({ success: true, data: { vehicle } });
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    await vehicleService.remove(String(req.params.id));
    res.status(200).json({ success: true, data: null });
  }),
};
