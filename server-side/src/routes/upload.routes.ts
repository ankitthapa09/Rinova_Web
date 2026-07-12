import { Router } from 'express';
import { uploadController } from '@/controllers/upload.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import { uploadSingle } from '@/middlewares/upload';

const router = Router();

// Admin-only media upload. :kind is 'image' or 'model'. The chain is:
// authenticate → require admin → parse+validate the file → hand to Cloudinary.
router.post(
  '/:kind',
  requireAuth,
  requireRole('admin'),
  uploadSingle('file'),
  uploadController.upload,
);

export default router;
