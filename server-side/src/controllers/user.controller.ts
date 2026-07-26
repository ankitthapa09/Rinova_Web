import type { Request, Response } from 'express';
import { userService } from '@/services/user.service';
import { catchAsync } from '@/utils/catchAsync';

export const userController = {
  // Admin

  list: catchAsync(async (_req: Request, res: Response) => {
    const users = await userService.list();
    res.status(200).json({ success: true, data: { users } });
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    await userService.remove(String(req.params.id));
    res.status(200).json({ success: true, data: null });
  }),
};
