import path from 'node:path';
import multer, { MulterError } from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/AppError';

/**
 * Multipart upload guard for vehicle media.
 * File upload is a classic attack surface, so this middleware is deliberately
 * strict: files are held in memory (never written to disk here and the service streams them straight to Cloudinary) and every file must pass BOTH an
 * allow listed extension AND an allow listed MIME type. We never trust one signal alone, and we never use the client-supplied filename for storage.
 */

export type UploadKind = 'image' | 'model';

const RULES: Record<
  UploadKind,
  { mimes: Set<string>; exts: Set<string>; maxBytes: number; label: string }
> = {
  image: {
    mimes: new Set(['image/png', 'image/jpeg', 'image/webp']),
    exts: new Set(['.png', '.jpg', '.jpeg', '.webp']),
    // 10 MB — the Cloudinary free-plan ceiling. Never set this above the plan
    // limit, or oversize files pass our check then fail at Cloudinary with a 500.
    maxBytes: 10 * 1024 * 1024,
    label: 'an image (PNG, JPG, or WEBP)',
  },
  model: {
    
    mimes: new Set(['model/gltf-binary', 'application/octet-stream']),
    exts: new Set(['.glb']),
    // Models may arrive large — the upload service Draco-compresses them before
    // storage, so only the compressed result must fit Cloudinary's 10 MB cap.
    maxBytes: 50 * 1024 * 1024,
    label: 'a 3D model (GLB)',
  },
};

// multer's fileSize limit is global; set it to the largest allowed so nothing
// oversized is ever buffered, then enforce the tighter per-kind cap afterward.
const MAX_ANY_BYTES = Math.max(...Object.values(RULES).map((r) => r.maxBytes));

export function isUploadKind(value: string): value is UploadKind {
  return value === 'image' || value === 'model';
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ANY_BYTES, files: 1 },
  fileFilter(req: Request, file, cb) {
    const kind = String(req.params.kind);
    if (!isUploadKind(kind)) return cb(new AppError(400, 'Unknown upload type'));

    const rule = RULES[kind];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!rule.exts.has(ext) || !rule.mimes.has(file.mimetype)) {
      return cb(new AppError(400, `Upload must be ${rule.label}`));
    }
    cb(null, true);
  },
});


export function uploadSingle(field = 'file') {
  const run = multerUpload.single(field);

  return (req: Request, res: Response, next: NextFunction) => {
    run(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            const mb = Math.round(MAX_ANY_BYTES / (1024 * 1024));
            return next(AppError.badRequest(`File is too large — uploads are limited to ${mb} MB.`));
          }
          return next(AppError.badRequest(`Upload error: ${err.message}`));
        }
        return next(err); // AppError from the fileFilter, or something unexpected
      }

      const kind = String(req.params.kind);
      if (!isUploadKind(kind)) return next(AppError.badRequest('Unknown upload type'));
      if (!req.file) return next(AppError.badRequest('No file was uploaded'));

      const rule = RULES[kind];
      if (req.file.size > rule.maxBytes) {
        const mb = Math.round(rule.maxBytes / (1024 * 1024));
        return next(AppError.badRequest(`That ${kind} must be under ${mb} MB`));
      }

      next();
    });
  };
}
