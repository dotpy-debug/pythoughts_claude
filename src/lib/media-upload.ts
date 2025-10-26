import { supabase } from './supabase';
import { logger } from './logger';

export interface UploadedMedia {
  id: string;
  filename: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  width?: number;
  height?: number;
  url: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const STORAGE_BUCKET = 'blog-media';

export class MediaUploadService {
  private async ensureBucketExists(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_VIDEO_SIZE,
        allowedMimeTypes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
      });

      if (error) {
        logger.error('Failed to create storage bucket', { error: error.message });
        throw new Error('Storage initialization failed');
      }
    }
  }

  validateFile(file: File, type: 'image' | 'video'): { valid: boolean; error?: string } {
    if (type === 'image') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP' };
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return { valid: false, error: 'Image too large. Maximum size: 10MB' };
      }
    } else if (type === 'video') {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid video type. Allowed: MP4, WebM, MOV' };
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return { valid: false, error: 'Video too large. Maximum size: 100MB' };
      }
    }

    return { valid: true };
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  private async compressImage(file: File, maxWidth: number = 1920): Promise<File> {
    if (file.type === 'image/gif') {
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  async uploadImage(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedMedia> {
    const validation = this.validateFile(file, 'image');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    await this.ensureBucketExists();

    let processedFile = file;
    let dimensions: { width: number; height: number } | undefined;

    try {
      dimensions = await this.getImageDimensions(file);

      if (dimensions.width > 1920 || file.size > 2 * 1024 * 1024) {
        processedFile = await this.compressImage(file);
        dimensions = await this.getImageDimensions(processedFile);
      }
    } catch (error) {
      logger.warn('Failed to process image', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    const fileExt = processedFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, processedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Failed to upload image', { error: uploadError.message });
      throw new Error('Upload failed');
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

    const { data: mediaRecord, error: dbError } = await supabase
      .from('media_files')
      .insert({
        user_id: userId,
        filename: processedFile.name,
        storage_path: fileName,
        file_type: processedFile.type,
        file_size: processedFile.size,
        width: dimensions?.width,
        height: dimensions?.height,
        upload_source: 'upload',
      })
      .select('id, filename, storage_path, file_type, file_size, width, height')
      .single();

    if (dbError) {
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      logger.error('Failed to save media record', { error: dbError.message });
      throw new Error('Failed to save media information');
    }

    return {
      ...mediaRecord,
      url: urlData.publicUrl,
    };
  }

  async uploadVideo(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedMedia> {
    const validation = this.validateFile(file, 'video');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    await this.ensureBucketExists();

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Failed to upload video', { error: uploadError.message });
      throw new Error('Upload failed');
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

    const { data: mediaRecord, error: dbError } = await supabase
      .from('media_files')
      .insert({
        user_id: userId,
        filename: file.name,
        storage_path: fileName,
        file_type: file.type,
        file_size: file.size,
        upload_source: 'upload',
      })
      .select('id, filename, storage_path, file_type, file_size, width, height')
      .single();

    if (dbError) {
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      logger.error('Failed to save media record', { error: dbError.message });
      throw new Error('Failed to save media information');
    }

    return {
      ...mediaRecord,
      url: urlData.publicUrl,
    };
  }

  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    const { data: media, error: fetchError } = await supabase
      .from('media_files')
      .select('storage_path, user_id')
      .eq('id', mediaId)
      .single();

    if (fetchError || !media) {
      throw new Error('Media not found');
    }

    if (media.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([media.storage_path]);

    if (storageError) {
      logger.error('Failed to delete file from storage', { error: storageError.message });
    }

    const { error: dbError } = await supabase.from('media_files').delete().eq('id', mediaId);

    if (dbError) {
      logger.error('Failed to delete media record', { error: dbError.message });
      throw new Error('Failed to delete media');
    }
  }

  async getUserMedia(userId: string, limit: number = 50): Promise<UploadedMedia[]> {
    const { data, error } = await supabase
      .from('media_files')
      .select('id, filename, storage_path, file_type, file_size, width, height')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch user media', { error: error.message });
      throw new Error('Failed to load media');
    }

    return (data || []).map((media) => {
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(media.storage_path);
      return {
        ...media,
        url: urlData.publicUrl,
      };
    });
  }
}

export const mediaUpload = new MediaUploadService();
