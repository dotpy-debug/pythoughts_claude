/**
 * Supabase Storage Service
 *
 * Centralized file upload and management service
 * Features:
 * - Image upload with validation
 * - File size limits
 * - Automatic file optimization
 * - Public URL generation
 * - File deletion
 * - Multiple bucket support
 */

import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  IMAGES: 'images',
  AVATARS: 'avatars',
  ATTACHMENTS: 'attachments',
  DOCUMENTS: 'documents',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * File upload options
 */
export interface UploadOptions {
  /**
   * Storage bucket name
   * @default STORAGE_BUCKETS.IMAGES
   */
  bucket?: StorageBucket;

  /**
   * Custom file path (folder structure)
   * @default ''
   */
  path?: string;

  /**
   * Maximum file size in bytes
   * @default 5 * 1024 * 1024 (5MB)
   */
  maxSize?: number;

  /**
   * Allowed MIME types
   * @default ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
   */
  allowedTypes?: string[];

  /**
   * Whether to make the file publicly accessible
   * @default true
   */
  isPublic?: boolean;

  /**
   * Cache control header (in seconds)
   * @default 3600 (1 hour)
   */
  cacheControl?: number;

  /**
   * Whether to upsert (overwrite) existing file
   * @default false
   */
  upsert?: boolean;
}

/**
 * Upload result
 */
export interface UploadResult {
  /**
   * Whether the upload was successful
   */
  success: boolean;

  /**
   * Public URL of the uploaded file
   */
  url?: string;

  /**
   * File path in storage
   */
  path?: string;

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * File validation error codes
 */
export enum FileValidationError {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_TYPE = 'INVALID_TYPE',
  NO_FILE = 'NO_FILE',
}

/**
 * Generate unique filename
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Validate file before upload
 */
function validateFile(
  file: File,
  options: UploadOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  } = options;

  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB, but file is ${fileSizeMB}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Upload file to Supabase Storage
 *
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const result = await uploadFile(file, {
 *   bucket: STORAGE_BUCKETS.IMAGES,
 *   path: 'posts',
 *   maxSize: 5 * 1024 * 1024, // 5MB
 * });
 *
 * if (result.success) {
 *   console.log('File uploaded:', result.url);
 * } else {
 *   console.error('Upload failed:', result.error);
 * }
 * ```
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    bucket = STORAGE_BUCKETS.IMAGES,
    path = '',
    cacheControl = 3600,
    upsert = false,
    isPublic = true,
  } = options;

  try {
    // Validate file
    const validation = validateFile(file, options);
    if (!validation.valid) {
      logger.warn('File validation failed', {
        error: validation.error,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate unique filename
    const fileName = generateFileName(file.name);
    const filePath = path ? `${path}/${fileName}` : fileName;

    logger.info('Uploading file to storage', {
      bucket,
      filePath,
      fileSize: file.size,
      fileType: file.type,
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: `${cacheControl}`,
        upsert,
      });

    if (error) {
      logger.error('Storage upload error', {
        error: error.message,
        bucket,
        filePath,
      });

      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    logger.info('File uploaded successfully', {
      bucket,
      filePath,
      url: urlData.publicUrl,
    });

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    logger.error('Unexpected error during file upload', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fileName: file.name,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Upload multiple files
 *
 * @example
 * ```typescript
 * const files = Array.from(event.target.files);
 * const results = await uploadMultipleFiles(files, {
 *   bucket: STORAGE_BUCKETS.IMAGES,
 *   path: 'gallery',
 * });
 *
 * const successful = results.filter(r => r.success);
 * console.log(`Uploaded ${successful.length} of ${files.length} files`);
 * ```
 */
export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  logger.info('Uploading multiple files', {
    count: files.length,
    bucket: options.bucket,
  });

  const uploadPromises = files.map(file => uploadFile(file, options));
  const results = await Promise.all(uploadPromises);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  logger.info('Multiple file upload complete', {
    total: files.length,
    successful: successCount,
    failed: failCount,
  });

  return results;
}

/**
 * Delete file from storage
 *
 * @example
 * ```typescript
 * const success = await deleteFile('images/posts/file.jpg', 'images');
 * ```
 */
export async function deleteFile(
  filePath: string,
  bucket: StorageBucket = STORAGE_BUCKETS.IMAGES
): Promise<boolean> {
  try {
    logger.info('Deleting file from storage', {
      bucket,
      filePath,
    });

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      logger.error('Storage deletion error', {
        error: error.message,
        bucket,
        filePath,
      });
      return false;
    }

    logger.info('File deleted successfully', {
      bucket,
      filePath,
    });

    return true;
  } catch (error) {
    logger.error('Unexpected error during file deletion', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      filePath,
    });
    return false;
  }
}

/**
 * Delete multiple files
 *
 * @example
 * ```typescript
 * const paths = ['images/file1.jpg', 'images/file2.jpg'];
 * const success = await deleteMultipleFiles(paths, 'images');
 * ```
 */
export async function deleteMultipleFiles(
  filePaths: string[],
  bucket: StorageBucket = STORAGE_BUCKETS.IMAGES
): Promise<boolean> {
  try {
    logger.info('Deleting multiple files from storage', {
      bucket,
      count: filePaths.length,
    });

    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      logger.error('Storage bulk deletion error', {
        error: error.message,
        bucket,
        count: filePaths.length,
      });
      return false;
    }

    logger.info('Files deleted successfully', {
      bucket,
      count: filePaths.length,
    });

    return true;
  } catch (error) {
    logger.error('Unexpected error during bulk file deletion', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      count: filePaths.length,
    });
    return false;
  }
}

/**
 * Get file public URL
 *
 * @example
 * ```typescript
 * const url = getFileUrl('images/posts/file.jpg', 'images');
 * ```
 */
export function getFileUrl(
  filePath: string,
  bucket: StorageBucket = STORAGE_BUCKETS.IMAGES
): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Create signed URL for private files
 *
 * @example
 * ```typescript
 * const url = await createSignedUrl('documents/private.pdf', 'documents', 3600);
 * ```
 */
export async function createSignedUrl(
  filePath: string,
  bucket: StorageBucket,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      logger.error('Error creating signed URL', {
        error: error.message,
        bucket,
        filePath,
      });
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    logger.error('Unexpected error creating signed URL', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filePath,
    });
    return null;
  }
}

/**
 * List files in a bucket path
 *
 * @example
 * ```typescript
 * const files = await listFiles('images', 'posts');
 * ```
 */
export async function listFiles(
  bucket: StorageBucket,
  path: string = ''
): Promise<Array<{ name: string; id: string; updated_at: string; created_at: string; last_accessed_at: string; metadata: Record<string, unknown> }>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) {
      logger.error('Error listing files', {
        error: error.message,
        bucket,
        path,
      });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error listing files', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bucket,
      path,
    });
    return [];
  }
}

/**
 * Helper: Convert file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Helper: Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Helper: Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Helper: Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Helper: Check if file is a document
 */
export function isDocumentFile(file: File): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  return documentTypes.includes(file.type);
}
