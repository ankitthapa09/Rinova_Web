import { Readable } from 'node:stream';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { processGlb } from 'gltf-pipeline';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { AppError } from '@/utils/AppError';
import type { UploadKind } from '@/middlewares/upload';

/**
 * Media storage via Cloudinary. Buffers come straight from the upload
 * middleware (held in memory, already type/size validated) and are streamed
 * up without ever touching our disk. The API secret lives only here on the
 * server, the browser never sees it.
 */

let configured = false;


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


const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024;

/**
 * Structural GLB check (magic bytes, version, chunk layout), proves the bytes
 * really are a GLB without depending on the compressor, so renamed junk files
 * get a clean 400 instead of being stored.
 */
function assertValidGlb(buffer: Buffer): void {
  const bad = () => AppError.badRequest('That file is not a valid GLB model');
  if (buffer.length < 20) throw bad();
  if (buffer.toString('latin1', 0, 4) !== 'glTF') throw bad(); // magic
  if (buffer.readUInt32LE(4) !== 2) throw bad(); // glTF version
  if (buffer.readUInt32LE(8) !== buffer.length) throw bad(); // declared length
  const chunkLen = buffer.readUInt32LE(12);
  if (buffer.toString('latin1', 16, 20) !== 'JSON' || 20 + chunkLen > buffer.length) throw bad();
  try {
    JSON.parse(buffer.toString('utf8', 20, 20 + chunkLen));
  } catch {
    throw bad();
  }
}

/**
 * Draco-compresses a GLB (typically 60-80% smaller) so large models fit the
 * storage limit and load faster in the browser. Best-effort, models that are
 * already Draco-compressed crash gltf-pipeline, those pass through as-is.
 */
async function compressModel(buffer: Buffer): Promise<Buffer> {
  assertValidGlb(buffer);
  try {
    const { glb } = await processGlb(buffer, { dracoOptions: { compressionLevel: 7 } });
    logger.info('model compressed', {
      beforeMB: (buffer.length / 1048576).toFixed(1),
      afterMB: (glb.length / 1048576).toFixed(1),
    });
    // Compression occasionally grows tiny files, keep whichever is smaller.
    return glb.length < buffer.length ? glb : buffer;
  } catch {
    logger.warn('glb compression skipped (likely already compressed)', {
      sizeMB: (buffer.length / 1048576).toFixed(1),
    });
    return buffer;
  }
}

// One place that pipes a validated buffer to Cloudinary and normalises errors.
function streamToCloudinary(
  buffer: Buffer,
  options: { folder: string; resourceType: 'image' | 'raw'; transformation?: object },
): Promise<UploadApiResponse> {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: options.folder, resource_type: options.resourceType, transformation: options.transformation },
      (error, response) => {
        if (error || !response) {
          // Cloudinary rejections (size, format, plan limits) arrive as plain
          // objects, wrap them in an AppError so the client gets a clean
          // message and status instead of a bare 500 "Unknown error".
          if (error) {
            const httpCode = typeof error.http_code === 'number' ? error.http_code : 502;
            const status = httpCode >= 400 && httpCode < 500 ? httpCode : 502;
            const message = /file size too large/i.test(error.message ?? '')
              ? 'That file is too large, uploads are limited to 10 MB.'
              : error.message || 'Media upload failed';
            return reject(new AppError(status, message));
          }
          return reject(new AppError(502, 'Media upload failed'));
        }
        resolve(response);
      },
    );
    Readable.from(buffer).pipe(stream);
  });
}

export const uploadService = {
  async uploadMedia(buffer: Buffer, kind: UploadKind): Promise<UploadResult> {
    ensureConfigured();

    if (kind === 'model') {
      buffer = await compressModel(buffer);
      if (buffer.length > STORAGE_LIMIT_BYTES) {
        throw AppError.badRequest(
          'Even after compression this model exceeds the 10 MB storage limit, simplify the model and try again',
        );
      }
    }

    // Photos are true images; GLB models are opaque binaries -> Cloudinary 'raw'.
    const resourceType = kind === 'image' ? 'image' : 'raw';
    const folder = kind === 'image' ? 'rinova/vehicles/photos' : 'rinova/vehicles/models';

    const result = await streamToCloudinary(buffer, { folder, resourceType });
    return { url: result.secure_url, publicId: result.public_id };
  },

  /** A user's profile photo, square, face-aware crop so any upload reads well
   * as a small circular avatar. Cloudinary does the resizing on the way in. */
  async uploadAvatar(buffer: Buffer): Promise<UploadResult> {
    ensureConfigured();
    const result = await streamToCloudinary(buffer, {
      folder: 'rinova/avatars',
      resourceType: 'image',
      transformation: { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    });
    return { url: result.secure_url, publicId: result.public_id };
  },

  /** Best-effort delete, used to clean up the old photo when one is replaced. */
  async destroy(publicId: string): Promise<void> {
    ensureConfigured();
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      logger.warn('failed to delete old Cloudinary asset', { publicId, err });
    }
  },
};
