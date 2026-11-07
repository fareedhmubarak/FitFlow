import { supabase } from './supabase';

export interface UploadImageResult {
  url: string;
  path: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
}

const THUMBNAIL_MAX_SIZE = 160;
const DETAIL_MAX_SIZE = 900;
const THUMBNAIL_QUALITY = 0.82;
const DETAIL_QUALITY = 0.82;

function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('.supabase.co/storage/v1/object/public/');
}

function getPublicObjectPath(url: string): string | null {
  const marker = '/storage/v1/object/public/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  const bucketAndPath = url.slice(markerIndex + marker.length).split('?')[0];
  const pathStart = bucketAndPath.indexOf('/');
  if (pathStart === -1) return null;

  try {
    return decodeURIComponent(bucketAndPath.slice(pathStart + 1));
  } catch {
    return bucketAndPath.slice(pathStart + 1);
  }
}

function getThumbnailPath(path: string): string {
  const slashIndex = path.lastIndexOf('/');
  const webpFileName = path.slice(slashIndex + 1).replace(/\.[^.]+$/, '.webp');
  if (slashIndex === -1) return `thumbs/${webpFileName}`;

  const folder = path.slice(0, slashIndex);
  return `${folder}/thumbs/${webpFileName}`;
}

function getThumbnailUrl(url: string): string {
  const objectPath = getPublicObjectPath(url);
  if (!objectPath) return url;

  const thumbnailPath = getThumbnailPath(objectPath);
  return url.replace(encodeURI(objectPath), encodeURI(thumbnailPath));
}

/**
 * Get an optimized image URL.
 * Small and medium UI surfaces use upload-time generated thumbnails.
 * Supabase image transforms require a paid plan, so thumbnails are stored
 * as normal objects under a sibling thumbs/ folder on the Free plan.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _size: 'sm' | 'md' | 'lg' | 'xl' = 'sm'
): string | undefined {
  if (!url) return undefined;
  // Already a thumbnail — never convert twice (would produce thumbs/thumbs/…)
  if (url.includes('/thumbs/')) return url;
  if (isSupabaseStorageUrl(url) && (_size === 'sm' || _size === 'md')) {
    return getThumbnailUrl(url);
  }
  return url;
}

export function getAvatarImageUrl(url: string | null | undefined): string | undefined {
  return getOptimizedImageUrl(url, 'sm');
}

/**
 * Preload an image into browser cache (fire-and-forget)
 */
export function preloadImage(url: string | null | undefined): void {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

/**
 * Upload an image to Supabase Storage with automatic compression.
 * Images are compressed to max 800px, converted to WebP, quality 0.8.
 * Cache-Control set to 1 year (immutable content-addressed).
 */
export async function uploadImage(
  file: File,
  bucket: string = 'images',
  folder?: string
): Promise<UploadImageResult> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.');
  }

  // Validate file size (max 10MB before compression)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit.');
  }

  // Auto-compress: store a detail image and a small thumbnail for list/avatar UI.
  let processedFile: File;
  let thumbnailFile: File | null = null;
  try {
    processedFile = await compressImage(file, DETAIL_MAX_SIZE, DETAIL_MAX_SIZE, DETAIL_QUALITY);
    thumbnailFile = await compressImage(file, THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE, THUMBNAIL_QUALITY);
  } catch (err) {
    console.warn('Image compression failed, uploading original:', err);
    processedFile = file;
  }

  // Generate unique file name (always .webp for compressed)
  const fileExt = processedFile.type === 'image/webp' ? 'webp' : processedFile.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;
  const thumbnailPath = getThumbnailPath(filePath);

  // Upload to Supabase Storage with 1-year cache (immutable)
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, processedFile, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  let thumbnailUrl: string | undefined;
  let uploadedThumbnailPath: string | undefined;

  if (thumbnailFile) {
    const { data: thumbData, error: thumbError } = await supabase.storage
      .from(bucket)
      .upload(thumbnailPath, thumbnailFile, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (!thumbError && thumbData?.path) {
      uploadedThumbnailPath = thumbData.path;
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(thumbData.path);
      thumbnailUrl = publicUrl;
    } else {
      console.warn('Thumbnail upload failed:', thumbError);
    }
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
    thumbnailUrl,
    thumbnailPath: uploadedThumbnailPath,
  };
}

/**
 * Delete an image from Supabase Storage
 * @param path - The path of the image to delete
 * @param bucket - The bucket name (default: 'images')
 */
export async function deleteImage(
  path: string,
  bucket: string = 'images'
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path, getThumbnailPath(path)]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Update an image (delete old, upload new)
 * @param file - The new file to upload
 * @param oldPath - The path of the old image to delete
 * @param bucket - The bucket name (default: 'images')
 * @param folder - Optional folder path within the bucket
 * @returns The public URL and path of the uploaded image
 */
export async function updateImage(
  file: File,
  oldPath: string | null,
  bucket: string = 'images',
  folder?: string
): Promise<UploadImageResult> {
  // Delete old image if it exists
  if (oldPath) {
    try {
      await deleteImage(oldPath, bucket);
    } catch (error) {
      // Log error but continue with upload
      console.error('Failed to delete old image:', error);
    }
  }

  // Upload new image
  return uploadImage(file, bucket, folder);
}

/**
 * Compress and resize an image before upload, converting to WebP.
 * @param file - The file to compress
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param maxHeight - Maximum height in pixels (default: 800)
 * @param quality - Compression quality 0-1 (default: 0.8)
 * @returns Compressed WebP file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Always output as WebP for best compression
        const outputType = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            // Change extension to .webp
            const newName = file.name.replace(/\.[^.]+$/, '.webp');
            const compressedFile = new File([blob], newName, {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
