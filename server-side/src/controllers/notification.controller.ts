import type { Request, Response } from 'express';
import { notificationService } from '@/services/notification.service';
import { catchAsync } from '@/utils/catchAsync';

// Every route here runs behind requireAuth — req.user is always set.
export const notificationController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listMine(req.user!.sub),
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
