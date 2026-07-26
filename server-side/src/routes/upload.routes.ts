import { Router } from 'express';
import { uploadController } from '@/controllers/upload.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import { uploadSingle } from '@/middlewares/upload';

const router = Router();

// Admin-only media upload. :kind is 'image' or 'model'. The chain is// authenticate to require admin to parse+validate the file to hand to Cloudinary.
router.post(
  '/:kind',
  requireAuth,
  requireRole('admin'),
  uploadSingle('file'),
  uploadController.upload,
);

export default router;
