/**
 * Image Optimization Utilities
 *
 * Client-side image processing using Canvas API
 * Features:
 * - Image resizing with aspect ratio preservation
 * - Format conversion (JPEG, WebP)
 * - Quality optimization
 * - Multiple size variant generation (thumbnail, small, medium, large)
 * - Blur placeholder generation (LQIP)
 * - EXIF orientation handling
 */

/**
 * Image size presets for responsive images
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 480, height: 480 },
  medium: { width: 1024, height: 1024 },
  large: { width: 1920, height: 1920 },
  placeholder: { width: 10, height: 10 },
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Supported output formats
 */
export type ImageFormat = 'jpeg' | 'webp' | 'png';

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
  /**
   * Maximum width (preserves aspect ratio)
   */
  maxWidth?: number;

  /**
   * Maximum height (preserves aspect ratio)
   */
  maxHeight?: number;

  /**
   * Output format
   * @default 'jpeg'
   */
  format?: ImageFormat;

  /**
   * Quality (0-1)
   * @default 0.85
   */
  quality?: number;

  /**
   * Whether to strip EXIF data
   * @default true
   */
  stripExif?: boolean;
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
  size: number;
}

/**
 * Optimized image result
 */
export interface OptimizedImage {
  blob: Blob;
  url: string;
  metadata: ImageMetadata;
}

/**
 * Load image from File or Blob
 */
export async function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Revoke object URL if source was a Blob or File to free memory
      if (typeof source !== 'string') {
        URL.revokeObjectURL(img.src);
      }
      resolve(img);
    };

    img.onerror = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(img.src);
      }
      reject(new Error('Failed to load image'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get image metadata
 */
export async function getImageMetadata(source: File | Blob): Promise<ImageMetadata> {
  const img = await loadImage(source);

  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    aspectRatio: img.naturalWidth / img.naturalHeight,
    format: source.type,
    size: source.size,
  };
}

/**
 * Calculate dimensions preserving aspect ratio
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth?: number,
  maxHeight?: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  const aspectRatio = originalWidth / originalHeight;

  if (maxWidth && width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width, height };
}

/**
 * Optimize image with resize and format conversion
 */
export async function optimizeImage(
  source: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth,
    maxHeight,
    format = 'jpeg',
    quality = 0.85,
    stripExif: _stripExif = true,
  } = options;

  // Load original image
  const img = await loadImage(source);

  // Calculate target dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight
  );

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image with high quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const blob = await canvasToBlob(canvas, mimeType, quality);

  return {
    blob,
    url: URL.createObjectURL(blob),
    metadata: {
      width,
      height,
      aspectRatio: width / height,
      format: mimeType,
      size: blob.size,
    },
  };
}

/**
 * Generate multiple image sizes
 */
export async function generateImageSizes(
  source: File | Blob,
  sizes: ImageSize[] = ['thumbnail', 'small', 'medium', 'large'],
  format: ImageFormat = 'jpeg',
  quality: number = 0.85
): Promise<Record<ImageSize, OptimizedImage>> {
  const results: Partial<Record<ImageSize, OptimizedImage>> = {};

  for (const size of sizes) {
    const preset = IMAGE_SIZES[size];
    const optimized = await optimizeImage(source, {
      maxWidth: preset.width,
      maxHeight: preset.height,
      format,
      quality,
    });

    results[size] = optimized;
  }

  return results as Record<ImageSize, OptimizedImage>;
}

/**
 * Generate blur placeholder (LQIP - Low Quality Image Placeholder)
 */
export async function generateBlurPlaceholder(
  source: File | Blob,
  size: number = 10
): Promise<string> {
  const img = await loadImage(source);

  // Calculate dimensions maintaining aspect ratio
  const aspectRatio = img.naturalWidth / img.naturalHeight;
  const width = aspectRatio >= 1 ? size : Math.round(size * aspectRatio);
  const height = aspectRatio >= 1 ? Math.round(size / aspectRatio) : size;

  // Create tiny canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw tiny image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to base64 data URL with low quality
  return canvas.toDataURL('image/jpeg', 0.1);
}

/**
 * Convert canvas to Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Resize image to fit within dimensions
 */
export async function resizeImage(
  source: File | Blob,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.85
): Promise<Blob> {
  const optimized = await optimizeImage(source, {
    maxWidth,
    maxHeight,
    quality,
  });

  return optimized.blob;
}

/**
 * Convert image to WebP format
 */
export async function convertToWebP(
  source: File | Blob,
  quality: number = 0.85
): Promise<Blob> {
  const optimized = await optimizeImage(source, {
    format: 'webp',
    quality,
  });

  return optimized.blob;
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal format based on browser support
 */
export function getOptimalFormat(): ImageFormat {
  return supportsWebP() ? 'webp' : 'jpeg';
}

/**
 * Calculate file size reduction percentage
 */
export function calculateSavings(originalSize: number, optimizedSize: number): number {
  return Math.round(((originalSize - optimizedSize) / originalSize) * 100);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compress image until it fits target size
 */
export async function compressToSize(
  source: File | Blob,
  targetSizeKB: number,
  format: ImageFormat = 'jpeg'
): Promise<OptimizedImage> {
  let quality = 0.9;
  let optimized = await optimizeImage(source, { format, quality });

  // Iteratively reduce quality until size is acceptable
  while (optimized.blob.size > targetSizeKB * 1024 && quality > 0.1) {
    quality -= 0.1;
    optimized = await optimizeImage(source, { format, quality });
  }

  // If still too large, try resizing
  if (optimized.blob.size > targetSizeKB * 1024) {
    const metadata = await getImageMetadata(source);
    const scaleFactor = Math.sqrt((targetSizeKB * 1024) / optimized.blob.size);
    optimized = await optimizeImage(source, {
      format,
      quality: 0.85,
      maxWidth: Math.round(metadata.width * scaleFactor),
      maxHeight: Math.round(metadata.height * scaleFactor),
    });
  }

  return optimized;
}
