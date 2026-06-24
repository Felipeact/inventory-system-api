/**
 * @file storage.ts
 * @description File storage abstraction with pluggable drivers.
 *
 * Selected via the STORAGE_DRIVER env var:
 * - `local`: writes to the filesystem under UPLOAD_DIR and serves files via the
 *   `/uploads` static route. Suitable for development or a mounted persistent volume.
 * - `s3`: writes to an S3-compatible bucket (AWS S3, Cloudflare R2, MinIO). Files
 *   survive redeploys and scale across multiple instances — the recommended setup
 *   for production on ephemeral container platforms.
 * - `cloudinary`: uploads to Cloudinary (managed image/file CDN). Files survive
 *   redeploys and are served from Cloudinary's CDN over HTTPS.
 *
 * `putObject` returns the URL that should be persisted in the database and handed
 * back to clients.
 */

import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from './logger';

/** Result of storing an object: the storage key and the URL clients use to fetch it. */
export interface PutResult {
  key: string;
  url: string;
}

/**
 * Store a binary object and return its key and public URL.
 *
 * @param key - Object key/path, e.g. `receipts/<companyId>/<filename>`
 * @param buffer - File contents
 * @param contentType - MIME type used for the stored object
 */
export async function putObject(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<PutResult> {
  if (env.STORAGE_DRIVER === 's3') {
    return putToS3(key, buffer, contentType);
  }
  if (env.STORAGE_DRIVER === 'cloudinary') {
    return putToCloudinary(key, buffer);
  }
  return putToLocal(key, buffer);
}

/** Write the object to the local filesystem under UPLOAD_DIR. */
async function putToLocal(key: string, buffer: Buffer): Promise<PutResult> {
  const dest = path.join(process.cwd(), env.UPLOAD_DIR, key);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, buffer);
  return { key, url: `/uploads/${key}` };
}

/** Lazily-initialised S3 client (only loaded when the s3 driver is used). */
let s3ClientPromise: Promise<import('@aws-sdk/client-s3').S3Client> | null = null;

async function getS3Client() {
  if (!s3ClientPromise) {
    s3ClientPromise = import('@aws-sdk/client-s3').then(
      ({ S3Client }) =>
        new S3Client({
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT || undefined,
          // Custom endpoints (R2/MinIO) require path-style addressing.
          forcePathStyle: Boolean(env.S3_ENDPOINT),
          credentials: {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY
          }
        })
    );
  }
  return s3ClientPromise;
}

/** Upload the object to the configured S3-compatible bucket. */
async function putToS3(key: string, buffer: Buffer, contentType: string): Promise<PutResult> {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );

  const base = env.S3_PUBLIC_BASE_URL
    ? env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')
    : `${env.S3_ENDPOINT.replace(/\/$/, '')}/${env.S3_BUCKET}`;

  logger.debug({ key, bucket: env.S3_BUCKET }, 'Stored object in S3');
  return { key, url: `${base}/${key}` };
}

/** Lazily-configured Cloudinary client (only loaded when the cloudinary driver is used). */
let cloudinaryPromise: Promise<typeof import('cloudinary').v2> | null = null;

async function getCloudinary() {
  if (!cloudinaryPromise) {
    cloudinaryPromise = import('cloudinary').then(({ v2: cloudinary }) => {
      // If CLOUDINARY_URL is set, the SDK reads credentials from it automatically;
      // otherwise configure from the discrete values. Always serve over HTTPS.
      if (env.CLOUDINARY_URL) {
        cloudinary.config({ secure: true });
      } else {
        cloudinary.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET,
          secure: true
        });
      }
      return cloudinary;
    });
  }
  return cloudinaryPromise;
}

/**
 * Upload the object to Cloudinary. The storage `key` (e.g. `receipts/<companyId>/<file>`)
 * becomes the Cloudinary `public_id` (with its extension stripped, since Cloudinary
 * appends the resolved format). `resource_type: 'auto'` handles images and PDFs alike.
 * Returns the CDN `secure_url` to persist and hand back to clients.
 */
async function putToCloudinary(key: string, buffer: Buffer): Promise<PutResult> {
  const cloudinary = await getCloudinary();

  const folder = env.CLOUDINARY_FOLDER.replace(/^\/+|\/+$/g, '');
  const withoutExt = key.replace(/\.[^/.]+$/, '');
  const publicId = folder ? `${folder}/${withoutExt}` : withoutExt;

  const result = await new Promise<import('cloudinary').UploadApiResponse>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: 'auto', overwrite: true },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve(res);
        }
      );
      stream.end(buffer);
    }
  );

  logger.debug({ key, publicId: result.public_id }, 'Stored object in Cloudinary');
  return { key, url: result.secure_url };
}
