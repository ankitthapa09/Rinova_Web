import type { Request, Response } from 'express';
import { catchAsync } from '@/utils/catchAsync';
import { uploadService } from '@/services/upload.service';
import { isUploadKind } from '@/middlewares/upload';
import { AppError } from '@/utils/AppError';

export const uploadController = {
  
  upload: catchAsync(async (req: Request, res: Response) => {
    const kind = String(req.params.kind);
    if (!isUploadKind(kind)) throw AppError.badRequest('Unknown upload type');
    if (!req.file) throw AppError.badRequest('No file was uploaded');

    const result = await uploadService.uploadMedia(req.file.buffer, kind);
    res.status(201).json({ success: true, data: result });
  }),
};
