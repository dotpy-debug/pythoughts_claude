/**
 * LazyVideoEmbed Component
 *
 * Lazy-loading video embed with thumbnail preview
 * Features:
 * - Click to activate (thumbnail → iframe)
 * - Intersection Observer lazy loading
 * - YouTube and Vimeo support
 * - Responsive aspect ratio
 * - Terminal-themed play button
 * - Performance optimization (no iframe until activated)
 */

import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  parseVideoUrl,

  type VideoData,
} from '../../lib/video-utils';

interface LazyVideoEmbedProperties {
  /**
   * Video URL (YouTube or Vimeo)
   */
  src: string;

  /**
   * Video title for accessibility
   */
  title?: string;

  /**
   * Aspect ratio (width / height)
   * @default 16/9
   */
  aspectRatio?: number;

  /**
   * Whether to enable lazy loading via Intersection Observer
   * @default true
   */
  lazy?: boolean;

  /**
   * Intersection Observer rootMargin
   * @default '200px'
   */
  rootMargin?: string;

  /**
   * Whether to autoplay when activated
   * @default false
   */
  autoplay?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Additional iframe attributes
   */
  iframeProps?: React.IframeHTMLAttributes<HTMLIFrameElement>;
}

/**
 * LazyVideoEmbed Component
 *
 * @example
 * ```tsx
 * <LazyVideoEmbed
 *   src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   title="Rick Astley - Never Gonna Give You Up"
 *   aspectRatio={16/9}
 *   lazy={true}
 * />
 * ```
 */
export function LazyVideoEmbed({
  src,
  title,
  aspectRatio = 16 / 9,
  lazy = true,
  rootMargin = '200px',
  autoplay = false,
  className,
  iframeProps: iframeProperties = {},
}: LazyVideoEmbedProperties) {
  const [isActivated, setIsActivated] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const containerReference = useRef<HTMLDivElement>(null);

  // Parse video URL
  useEffect(() => {
    const data = parseVideoUrl(src);
    setVideoData(data);
  }, [src]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !containerReference.current || isActivated) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(containerReference.current);

    return () => {
      observer.disconnect();
    };
  }, [lazy, rootMargin, isActivated]);

  const handleActivate = () => {
    setIsActivated(true);
  };

  if (!videoData) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-gray-900 rounded-lg',
          className
        )}
        style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-400 font-mono">Invalid video URL</p>
        </div>
      </div>
    );
  }

  // Get thumbnail URL
  let thumbnailUrl: string | undefined;
  if (videoData.platform === 'youtube') {
    thumbnailUrl = videoData.thumbnailUrl;
  }
  // Vimeo thumbnails require API call - could be added later

  // Build embed URL with autoplay if activated
  let embedUrl = videoData.embedUrl;
  if (isActivated && autoplay) {
    const separator = embedUrl.includes('?') ? '&' : '?';
    if (videoData.platform === 'youtube') {
      embedUrl += `${separator}autoplay=1&mute=1`;
    } else if (videoData.platform === 'vimeo') {
      embedUrl += `${separator}autoplay=1&muted=1`;
    }
  }

  return (
    <div
      ref={containerReference}
      className={cn(
        'relative overflow-hidden bg-gray-900 rounded-lg group',
        className
      )}
      style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
    >
      {!isActivated && isInView && thumbnailUrl && (
        <>
          {/* Thumbnail Image */}
          <img
            src={thumbnailUrl}
            alt={title || 'Video thumbnail'}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />

          {/* Play Button Overlay */}
          <button
            onClick={handleActivate}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors cursor-pointer"
            aria-label={`Play video: ${title || 'video'}`}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-terminal-green/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <Play
                size={40}
                className="text-gray-900 fill-gray-900 ml-1"
                aria-hidden="true"
              />
            </div>
          </button>

          {/* Video Info Overlay */}
          {title && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-sm font-bold text-gray-100 line-clamp-2">
                {title}
              </h3>
            </div>
          )}
        </>
      )}

      {!isActivated && !thumbnailUrl && isInView && (
        /* Fallback for videos without thumbnails (Vimeo) */
        <button
          onClick={handleActivate}
          className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
          aria-label={`Load video: ${title || 'video'}`}
        >
          <div className="w-20 h-20 rounded-full bg-terminal-green flex items-center justify-center mb-3">
            <Play
              size={32}
              className="text-gray-900 fill-gray-900 ml-1"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm text-gray-300 font-mono">Click to load video</p>
          {title && (
            <p className="text-xs text-gray-400 mt-2 max-w-xs text-center px-4">
              {title}
            </p>
          )}
        </button>
      )}

      {isActivated && (
        /* Video Iframe */
        <iframe
          src={embedUrl}
          title={title || 'Embedded video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          {...iframeProperties}
        />
      )}

      {!isInView && (
        /* Placeholder before in view */
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="w-12 h-12 border-2 border-terminal-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * VideoAspectRatio wrapper component
 *
 * Maintains aspect ratio for video embeds
 */
interface VideoAspectRatioProperties {
  /**
   * Aspect ratio (width / height)
   * @default 16/9
   */
  ratio?: number;

  /**
   * Children to render
   */
  children: React.ReactNode;

  /**
   * Custom className
   */
  className?: string;
}

export function VideoAspectRatio({
  ratio = 16 / 9,
  children,
  className,
}: VideoAspectRatioProperties) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ paddingBottom: `${(1 / ratio) * 100}%` }}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
