import type { Request, Response } from 'express';
import { notificationService } from '@/services/notification.service';
import { DEFAULT_LIMIT, MAX_LIMIT } from '@/repositories/notification.repository';
import { catchAsync } from '@/utils/catchAsync';

// Reads ?limit, ignoring junk — clamped to a sane range so it can't be abused.
function parseLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

// 1-based page; anything invalid falls back to the first page.
function parsePage(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

// Every route here runs behind requireAuth — req.user is always set.
export const notificationController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit);
    const page = parsePage(req.query.page);
    const [{ notifications, total }, unreadCount] = await Promise.all([
      notificationService.listMine(req.user!.sub, { limit, skip: (page - 1) * limit }),
      notificationService.unreadCount(req.user!.sub),
    ]);
    res.status(200).json({ success: true, data: { notifications, unreadCount, total, page, limit } });
  }),

  // Lightweight endpoint for the bell to poll.
  unreadCount: catchAsync(async (req: Request, res: Response) => {
    const unreadCount = await notificationService.unreadCount(req.user!.sub);
    res.status(200).json({ success: true, data: { unreadCount } });
  }),

  markRead: catchAsync(async (req: Request, res: Response) => {
    const notification = await notificationService.markRead(String(req.params.id), req.user!.sub);
    res.status(200).json({ success: true, data: { notification } });
  }),

  markAllRead: catchAsync(async (req: Request, res: Response) => {
    const updated = await notificationService.markAllRead(req.user!.sub);
    res.status(200).json({ success: true, data: { updated } });
  }),

  // Owner-scoped in the service — you can only delete your own.
  remove: catchAsync(async (req: Request, res: Response) => {
    await notificationService.remove(String(req.params.id), req.user!.sub);
    res.status(200).json({ success: true, data: null });
  }),
};
