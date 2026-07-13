import type { Request, Response } from 'express';
import { bookingService } from '@/services/booking.service';
import { catchAsync } from '@/utils/catchAsync';

export const bookingController = {
  // ── Customer ─────────────────────────────────────────────

  create: catchAsync(async (req: Request, res: Response) => {
    const booking = await bookingService.create(req.user!.sub, req.body);
    res.status(201).json({ success: true, data: { booking } });
  }),

  listMine: catchAsync(async (req: Request, res: Response) => {
    const bookings = await bookingService.listMine(req.user!.sub);
    res.status(200).json({ success: true, data: { bookings } });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    const booking = await bookingService.cancel(String(req.params.id), req.user!.sub);
    res.status(200).json({ success: true, data: { booking } });
  }),

  // ── Admin ────────────────────────────────────────────────

  listAll: catchAsync(async (_req: Request, res: Response) => {
    const bookings = await bookingService.listAll();
    res.status(200).json({ success: true, data: { bookings } });
  }),

  updateStatus: catchAsync(async (req: Request, res: Response) => {
    const booking = await bookingService.updateStatus(String(req.params.id), req.body);
    res.status(200).json({ success: true, data: { booking } });
  }),
};
