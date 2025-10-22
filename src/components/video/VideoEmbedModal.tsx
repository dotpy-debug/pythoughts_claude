/**
 * VideoEmbedModal Component
 *
 * Modal for embedding videos in TipTap editor
 * Features:
 * - URL input with validation
 * - Platform detection (YouTube, Vimeo)
 * - Player controls configuration
 * - Video preview
 * - Terminal-themed design
 */

import { useState, useEffect } from 'react';
import { X, Video, Check, AlertCircle, Youtube } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  parseVideoUrl,
  isValidVideoUrl,
  type VideoData,
} from '../../lib/video-utils';

interface VideoEmbedModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when video is embedded
   */
  onEmbed: (videoData: VideoData, options: VideoPlayerOptions) => void;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Initial URL (for editing)
   */
  initialUrl?: string;

  /**
   * Custom className
   */
  className?: string;
}

export interface VideoPlayerOptions {
  autoplay: boolean;
  controls: boolean;
  loop: boolean;
  muted: boolean;
  width: number;
  height: number;
}

/**
 * VideoEmbedModal Component
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * const handleEmbed = (videoData, options) => {
 *   editor.chain().focus().setYoutubeVideo({ src: videoData.embedUrl }).run();
 *   setIsOpen(false);
 * };
 *
 * <VideoEmbedModal
 *   isOpen={isOpen}
 *   onEmbed={handleEmbed}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function VideoEmbedModal({
  isOpen,
  onEmbed,
  onClose,
  initialUrl = '',
  className,
}: VideoEmbedModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string>('');
  const [options, setOptions] = useState<VideoPlayerOptions>({
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
    width: 640,
    height: 360,
  });

  // Parse URL when it changes
  useEffect(() => {
    if (!url) {
      setVideoData(null);
      setError('');
      return;
    }

    const data = parseVideoUrl(url);

    if (data) {
      setVideoData(data);
      setError('');
    } else if (url.length > 10) {
      // Only show error if URL is long enough to be valid
      setError('Invalid video URL. Supported: YouTube, Vimeo');
      setVideoData(null);
    }
  }, [url]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleOptionChange = (key: keyof VideoPlayerOptions, value: any) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleEmbed = () => {
    if (!videoData) return;

    onEmbed(videoData, options);
    handleClose();
  };

  const handleClose = () => {
    setUrl('');
    setVideoData(null);
    setError('');
    setOptions({
      autoplay: false,
      controls: true,
      loop: false,
      muted: false,
      width: 640,
      height: 360,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && videoData) {
      handleEmbed();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Embed video"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-2xl mx-4 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Video size={20} className="text-terminal-green" />
            <h2 className="text-lg font-bold text-gray-100 font-mono">
              Embed Video
            </h2>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* URL Input */}
          <div>
            <label
              htmlFor="video-url"
              className="block text-sm font-mono text-gray-300 mb-2"
            >
              Video URL
            </label>
            <input
              id="video-url"
              type="url"
              value={url}
              onChange={handleUrlChange}
              onKeyDown={handleKeyDown}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-terminal-green transition-colors"
              autoFocus
            />

            {/* Status Indicator */}
            {videoData && (
              <div className="flex items-center gap-2 mt-2 text-sm text-terminal-green">
                <Check size={16} />
                <span className="font-mono">
                  Valid {videoData.platform === 'youtube' ? 'YouTube' : 'Vimeo'} URL
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                <AlertCircle size={16} />
                <span className="font-mono">{error}</span>
              </div>
            )}
          </div>

          {/* Video Preview */}
          {videoData && (
            <div className="space-y-4">
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                {videoData.platform === 'youtube' && videoData.thumbnailUrl && (
                  <img
                    src={videoData.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                )}
                {videoData.platform === 'vimeo' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <Youtube size={64} className="text-gray-600" />
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="text-sm font-mono space-y-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-terminal-green">Platform:</span>
                  <span className="capitalize">{videoData.platform}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-terminal-green">Video ID:</span>
                  <span>{videoData.videoId}</span>
                </div>
                {videoData.platform === 'youtube' && videoData.startTime !== undefined && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-terminal-green">Start Time:</span>
                    <span>{videoData.startTime}s</span>
                  </div>
                )}
                {videoData.platform === 'youtube' && videoData.playlistId && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-terminal-green">Playlist:</span>
                    <span>{videoData.playlistId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Player Options */}
          {videoData && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold font-mono text-gray-300">
                Player Options
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.autoplay}
                    onChange={(e) => handleOptionChange('autoplay', e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-terminal-green focus:ring-terminal-green focus:ring-offset-gray-900"
                  />
                  <span className="text-sm font-mono text-gray-300">Autoplay</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.controls}
                    onChange={(e) => handleOptionChange('controls', e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-terminal-green focus:ring-terminal-green focus:ring-offset-gray-900"
                  />
                  <span className="text-sm font-mono text-gray-300">Show Controls</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.loop}
                    onChange={(e) => handleOptionChange('loop', e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-terminal-green focus:ring-terminal-green focus:ring-offset-gray-900"
                  />
                  <span className="text-sm font-mono text-gray-300">Loop</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.muted}
                    onChange={(e) => handleOptionChange('muted', e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-terminal-green focus:ring-terminal-green focus:ring-offset-gray-900"
                  />
                  <span className="text-sm font-mono text-gray-300">Muted</span>
                </label>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={options.width}
                    onChange={(e) => handleOptionChange('width', parseInt(e.target.value, 10))}
                    min={320}
                    max={1920}
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono text-sm focus:outline-none focus:border-terminal-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={options.height}
                    onChange={(e) => handleOptionChange('height', parseInt(e.target.value, 10))}
                    min={180}
                    max={1080}
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono text-sm focus:outline-none focus:border-terminal-green"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-900/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors font-mono text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleEmbed}
            disabled={!videoData}
            className="px-4 py-2 rounded-lg bg-terminal-blue text-gray-900 hover:bg-terminal-green font-bold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 text-sm"
          >
            <Check size={16} />
            <span>Embed Video</span>
          </button>
        </div>
      </div>
    </div>
  );
}
