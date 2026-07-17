import type { Request, Response } from 'express';
import { washOrderService } from '@/services/washOrder.service';
import { catchAsync } from '@/utils/catchAsync';
import type { WashAvailabilityQuery } from '@/validators/washOrder.validator';

export const washOrderController = {
  // ── Public ───────────────────────────────────────────────

  catalogue: catchAsync(async (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: washOrderService.catalogue() });
  }),

  availability: catchAsync(async (_req: Request, res: Response) => {
    const { date } = res.locals.query as WashAvailabilityQuery;
    const slots = await washOrderService.availability(date);
    res.status(200).json({ success: true, data: { slots } });
  }),

  // ── Customer ─────────────────────────────────────────────

  create: catchAsync(async (req: Request, res: Response) => {
    const order = await washOrderService.create(req.user!.sub, req.body);
    res.status(201).json({ success: true, data: { order } });
  }),

  listMine: catchAsync(async (req: Request, res: Response) => {
    const orders = await washOrderService.listMine(req.user!.sub);
    res.status(200).json({ success: true, data: { orders } });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    const order = await washOrderService.cancel(String(req.params.id), req.user!.sub);
    res.status(200).json({ success: true, data: { order } });
  }),

  // ── Admin ────────────────────────────────────────────────

  listAll: catchAsync(async (_req: Request, res: Response) => {
    const orders = await washOrderService.listAll();
    res.status(200).json({ success: true, data: { orders } });
  }),

  updateStatus: catchAsync(async (req: Request, res: Response) => {
    const order = await washOrderService.updateStatus(String(req.params.id), req.body);
    res.status(200).json({ success: true, data: { order } });
  }),
};
