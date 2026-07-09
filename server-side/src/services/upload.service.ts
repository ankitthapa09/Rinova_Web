import { Readable } from 'node:stream';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import type { UploadKind } from '@/middlewares/upload';

/**
 * Media storage via Cloudinary. Buffers come straight from the upload
 * middleware (held in memory, already type/size validated) and are streamed
 * up without ever touching our disk. The API secret lives only here on the
 * server — the browser never sees it.
 */

let configured = false;

// Configure lazily on first use, not at import time: the API can boot without
// Cloudinary credentials, and only an actual upload should require them.
function ensureConfigured(): void {
  if (configured) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'Media uploads are not configured on the server');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true, // always return https URLs
  });
  configured = true;
}

export interface UploadResult {
  url: string;
  publicId: string;
}

export const uploadService = {
  async uploadMedia(buffer: Buffer, kind: UploadKind): Promise<UploadResult> {
    ensureConfigured();

    // Photos are true images; GLB models are opaque binaries → Cloudinary 'raw'.
    const resourceType = kind === 'image' ? 'image' : 'raw';
    const folder = kind === 'image' ? 'rinova/vehicles/photos' : 'rinova/vehicles/models';

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, response) => {
          if (error || !response) {
            return reject(error ?? new AppError(502, 'Media upload failed'));
          }
          resolve(response);
        },
      );
      Readable.from(buffer).pipe(stream);
    });

    return { url: result.secure_url, publicId: result.public_id };
  },
};
