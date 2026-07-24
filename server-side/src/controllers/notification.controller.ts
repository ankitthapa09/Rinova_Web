import type { Request, Response } from 'express';
import { notificationService } from '@/services/notification.service';
import { MAX_LIMIT } from '@/repositories/notification.repository';
import { catchAsync } from '@/utils/catchAsync';

// Reads ?limit, ignoring junk — clamped to a sane range so it can't be abused.
function parseLimit(raw: unknown): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

// Every route here runs behind requireAuth — req.user is always set.
export const notificationController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit);
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listMine(req.user!.sub, limit),
      notificationService.unreadCount(req.user!.sub),
    ]);
    res.status(200).json({ success: true, data: { notifications, unreadCount } });
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
};
