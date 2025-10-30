import { useState, useEffect } from 'react';
import { Upload, Video, Trash2, Loader2, Copy, Check } from 'lucide-react';
import { mediaUpload, UploadedMedia } from '../../lib/media-upload';
import { useAuth } from '../../contexts/AuthContext';
import { ShadcnButton } from '../ui/ShadcnButton';
import { logger } from '../../lib/logger';

interface MediaLibraryProps {
  onImageSelect?: (url: string) => void;
  selectionMode?: boolean;
}

export function MediaLibrary({ onImageSelect, selectionMode = false }: MediaLibraryProps) {
  const { user } = useAuth();
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userMedia = await mediaUpload.getUserMedia(user.id);
      setMedia(userMedia);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load media';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      setError(errorMessage);
      logger.error('Failed to load media library', errorObj);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    setError('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const isVideo = file.type.startsWith('video/');
        return isVideo
          ? await mediaUpload.uploadVideo(file, user.id)
          : await mediaUpload.uploadImage(file, user.id);
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setMedia((prev) => [...uploadedMedia, ...prev]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      setError(errorMessage);
      logger.error('Media upload failed', errorObj);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!user || !confirm('Are you sure you want to delete this media?')) return;

    try {
      await mediaUpload.deleteMedia(mediaId, user.id);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      setError(errorMessage);
      logger.error('Media delete failed', errorObj);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to copy URL', errorObj);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Media Library</h2>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <span className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-800'} h-10 px-4 py-2 bg-gray-900 text-white border border-gray-700`}>
            {uploading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2" size={16} />
                Upload Media
              </>
            )}
          </span>
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {media.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-400 mb-4">No media uploaded yet</p>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 cursor-pointer hover:bg-gray-800 h-10 px-4 py-2 bg-gray-900 text-white border border-gray-700">
              Upload Your First Media
            </span>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => {
            const isVideo = item.file_type.startsWith('video/');
            const isImage = item.file_type.startsWith('image/');

            return (
              <div
                key={item.id}
                className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {isImage && (
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {isVideo && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <Video className="text-gray-400" size={48} />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2">
                  <div className="text-white text-xs text-center mb-2">
                    <div className="font-medium truncate w-full">{item.filename}</div>
                    <div className="text-gray-300">
                      {formatFileSize(item.file_size)}
                      {item.width && item.height && ` · ${item.width}×${item.height}`}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {selectionMode && onImageSelect && isImage ? (
                      <ShadcnButton
                        size="sm"
                        variant="default"
                        onClick={() => onImageSelect(item.url)}
                      >
                        Select
                      </ShadcnButton>
                    ) : (
                      <ShadcnButton
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(item.url)}
                      >
                        {copiedUrl === item.url ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </ShadcnButton>
                    )}
                    <ShadcnButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </ShadcnButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
