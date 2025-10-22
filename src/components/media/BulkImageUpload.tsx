/**
 * BulkImageUpload Component
 *
 * Bulk image upload with drag-and-drop, preview grid, and progress tracking
 * Features:
 * - Multi-file drag-and-drop support
 * - Preview grid with thumbnails
 * - Individual upload progress bars
 * - Parallel uploads (max 3 concurrent)
 * - Cancel functionality
 * - File validation and error handling
 * - Terminal-themed design
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { MediaUploadService } from '../../lib/media-upload';

interface UploadFile {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadedUrl?: string;
}

interface BulkImageUploadProps {
  /**
   * User ID for organizing uploads
   */
  userId: string;

  /**
   * Callback when all uploads are complete
   */
  onUploadComplete?: (uploadedUrls: string[]) => void;

  /**
   * Callback when individual file is uploaded
   */
  onFileUploaded?: (url: string, file: File) => void;

  /**
   * Maximum number of files to upload at once
   * @default 10
   */
  maxFiles?: number;

  /**
   * Maximum file size in MB
   * @default 10
   */
  maxSizeMB?: number;

  /**
   * Accepted file types
   * @default ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
   */
  acceptedTypes?: string[];

  /**
   * Maximum concurrent uploads
   * @default 3
   */
  maxConcurrent?: number;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Whether to auto-start uploads after selection
   * @default false
   */
  autoUpload?: boolean;
}

/**
 * BulkImageUpload Component
 *
 * @example
 * ```tsx
 * <BulkImageUpload
 *   userId="user-123"
 *   onUploadComplete={(urls) => console.log('All uploaded:', urls)}
 *   onFileUploaded={(url, file) => insertImageToEditor(url)}
 *   maxFiles={10}
 *   autoUpload={false}
 * />
 * ```
 */
export function BulkImageUpload({
  userId,
  onUploadComplete,
  onFileUploaded,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxConcurrent = 3,
  className,
  autoUpload = false,
}: BulkImageUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Handle dropped/selected files
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));

      if (autoUpload) {
        uploadFiles(newFiles);
      }
    },
    [maxFiles, autoUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: true,
  });

  // Upload files with concurrency control
  const uploadFiles = async (filesToUpload: UploadFile[] = files) => {
    setIsUploading(true);

    const pendingFiles = filesToUpload.filter((f) => f.status === 'pending');
    const uploadQueue = [...pendingFiles];
    const results: string[] = [];

    // Upload with concurrency limit
    const uploadPromises: Promise<void>[] = [];

    for (let i = 0; i < maxConcurrent; i++) {
      uploadPromises.push(processQueue());
    }

    async function processQueue(): Promise<void> {
      while (uploadQueue.length > 0) {
        const fileToUpload = uploadQueue.shift();
        if (!fileToUpload) break;

        await uploadSingleFile(fileToUpload);
      }
    }

    async function uploadSingleFile(uploadFile: UploadFile) {
      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
          )
        );

        // Upload with progress tracking
        const response = await MediaUploadService.uploadImage(
          uploadFile.file,
          userId,
          (progress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress } : f
              )
            );
          }
        );

        const uploadedUrl = response.publicUrl;

        // Update status to success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'success', progress: 100, uploadedUrl }
              : f
          )
        );

        results.push(uploadedUrl);
        onFileUploaded?.(uploadedUrl, uploadFile.file);
      } catch (error) {
        // Update status to error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
      }
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    setIsUploading(false);
    onUploadComplete?.(results);
  };

  // Remove file from list
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Retry failed upload
  const retryFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'pending', progress: 0, error: undefined } : f
        )
      );
      uploadFiles([{ ...file, status: 'pending', progress: 0 }]);
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-terminal-green bg-terminal-green/10 scale-102'
            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50',
          isUploading && 'opacity-50 pointer-events-none'
        )}
      >
        <input {...getInputProps()} disabled={isUploading} />

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
            <Upload size={32} className="text-terminal-green" />
          </div>

          <div>
            <p className="text-lg font-bold text-gray-100 font-mono mb-1">
              {isDragActive ? 'Drop images here' : 'Drag & drop images'}
            </p>
            <p className="text-sm text-gray-400">
              or click to browse • Max {maxFiles} files, {maxSizeMB}MB each
            </p>
          </div>

          {fileRejections.length > 0 && (
            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">
                {fileRejections.length} file(s) rejected: Invalid type or size
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Grid */}
      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm font-mono">
              <span className="text-gray-400">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </span>
              {successCount > 0 && (
                <span className="text-terminal-green">✓ {successCount} uploaded</span>
              )}
              {errorCount > 0 && (
                <span className="text-red-400">✗ {errorCount} failed</span>
              )}
            </div>

            {!autoUpload && pendingCount > 0 && !isUploading && (
              <button
                onClick={() => uploadFiles()}
                className="px-4 py-2 rounded-lg bg-terminal-blue text-gray-900 hover:bg-terminal-green font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Upload size={16} />
                <span>Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="relative group aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900"
              >
                {/* Image Preview */}
                <img
                  src={uploadFile.preview}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />

                {/* Status Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end p-2">
                  {/* Status Icon */}
                  <div className="absolute top-2 right-2">
                    {uploadFile.status === 'pending' && (
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                        <ImageIcon size={14} className="text-gray-400" />
                      </div>
                    )}
                    {uploadFile.status === 'uploading' && (
                      <div className="w-6 h-6 rounded-full bg-terminal-blue flex items-center justify-center">
                        <Loader2 size={14} className="text-gray-900 animate-spin" />
                      </div>
                    )}
                    {uploadFile.status === 'success' && (
                      <div className="w-6 h-6 rounded-full bg-terminal-green flex items-center justify-center">
                        <Check size={14} className="text-gray-900" />
                      </div>
                    )}
                    {uploadFile.status === 'error' && (
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <AlertCircle size={14} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  {uploadFile.status !== 'uploading' && (
                    <button
                      onClick={() => removeFile(uploadFile.id)}
                      className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gray-900/80 hover:bg-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X size={14} className="text-gray-300" />
                    </button>
                  )}

                  {/* Progress Bar */}
                  {uploadFile.status === 'uploading' && (
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-terminal-green transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadFile.status === 'error' && (
                    <button
                      onClick={() => retryFile(uploadFile.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-mono"
                      title={uploadFile.error}
                    >
                      Retry
                    </button>
                  )}

                  {/* Success */}
                  {uploadFile.status === 'success' && (
                    <span className="text-xs text-terminal-green font-mono">
                      Uploaded
                    </span>
                  )}

                  {/* Pending */}
                  {uploadFile.status === 'pending' && (
                    <span className="text-xs text-gray-400 font-mono">
                      Waiting...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
