import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/storage';
import { logger } from '../../lib/logger';

interface ImageUploadProperties {
  currentImageUrl?: string;
  onImageChange: (url: string) => void;
  maxSizeMB?: number;
  aspectRatio?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageChange,
  maxSizeMB = 5,
  aspectRatio,
}: ImageUploadProperties) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentImageUrl || '');
  const fileInputReference = useRef<HTMLInputElement>(null);

  const validateImage = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please upload an image file';
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `Image size must be less than ${maxSizeMB}MB (current: ${sizeMB.toFixed(2)}MB)`;
    }

    // Supported formats
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedFormats.includes(file.type)) {
      return 'Supported formats: JPEG, PNG, WebP, GIF';
    }

    return null;
  };

  const handleFile = async (file: File) => {
    setError('');

    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);

    try {
      // Create a local preview immediately for better UX
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const result = await uploadFile(file, {
        bucket: STORAGE_BUCKETS.IMAGES,
        path: 'uploads',
        maxSize: maxSizeMB * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });

      if (!result.success || !result.url) {
        setError(result.error || 'Failed to upload image');
        setPreview('');
        logger.error('Image upload failed', {
          errorMessage: result.error,
          fileName: file.name,
        });
        return;
      }

      // Use the uploaded URL
      setPreview(result.url);
      onImageChange(result.url);

      logger.info('Image uploaded successfully', {
        fileName: file.name,
        url: result.url,
      });

    } catch (error_) {
      const errorMessage = 'Failed to upload image. Please try again.';
      setError(errorMessage);
      setPreview('');
      if (error_ instanceof Error) {
        logger.error('Image upload error', error_, { fileName: file.name });
      } else {
        logger.error('Image upload error', {
          errorMessage: 'Unknown error',
          fileName: file.name,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onImageChange('');
    if (fileInputReference.current) {
      fileInputReference.current.value = '';
    }
  };

  const handleUrlInput = (url: string) => {
    setError('');
    setPreview(url);
    onImageChange(url);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-mono text-gray-300 mb-2">
        <span className="text-terminal-green">$ </span>Cover Image
      </label>

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Cover preview"
            className="w-full h-64 object-cover rounded-lg border border-gray-700"
            style={aspectRatio ? { aspectRatio } : undefined}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <Button
              onClick={handleRemove}
              variant="secondary"
              size="sm"
              className="font-mono"
            >
              <X size={16} className="mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
            isDragging
              ? 'border-terminal-green bg-terminal-green/10'
              : 'border-gray-700 hover:border-gray-600'
          } ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          onClick={() => fileInputReference.current?.click()}
        >
          <input
            ref={fileInputReference}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            {uploading ? (
              <>
                <Loader2 className="animate-spin text-terminal-green" size={48} />
                <p className="text-sm text-gray-400 font-mono">Uploading...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  <Upload className="text-terminal-green" size={32} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300 font-mono mb-1">
                    Drag & drop an image here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    Supports: JPEG, PNG, WebP, GIF (max {maxSizeMB}MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm font-mono">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* URL Input Alternative */}
      <div className="space-y-2">
        <label className="block text-xs text-gray-400 font-mono">Or paste image URL:</label>
        <input
          type="url"
          value={preview}
          onChange={(e) => handleUrlInput(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono text-sm focus:outline-none focus:border-terminal-green placeholder:text-gray-500"
        />
      </div>
    </div>
  );
}
