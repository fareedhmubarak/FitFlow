import { supabase } from './supabase';

export interface UploadImageResult {
  url: string;
  path: string;
}

/**
 * Get an optimized image URL.
 * NOTE: Supabase Image Transforms (/render/image/public/) require Pro plan.
 * On Free plan, we return the original URL. Upload-time compression (WebP 800px)
 * already handles optimization.
 * 
 * This function is kept as a pass-through so consumers don't need changes
 * if we upgrade to Pro in the future.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _size: 'sm' | 'md' | 'lg' | 'xl' = 'sm'
): string | undefined {
  if (!url) return undefined;
  return url;
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

  // Auto-compress: resize to max 800px, WebP, quality 0.8
  let processedFile: File;
  try {
    processedFile = await compressImage(file, 800, 800, 0.8);
    console.log(`📸 Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(processedFile.size / 1024).toFixed(0)}KB (${((1 - processedFile.size / file.size) * 100).toFixed(0)}% reduction)`);
  } catch (err) {
    console.warn('Image compression failed, uploading original:', err);
    processedFile = file;
  }

  // Generate unique file name (always .webp for compressed)
  const fileExt = processedFile.type === 'image/webp' ? 'webp' : processedFile.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

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

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
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
  const { error } = await supabase.storage.from(bucket).remove([path]);

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
