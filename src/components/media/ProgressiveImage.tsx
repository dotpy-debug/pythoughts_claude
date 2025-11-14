/**
 * ProgressiveImage Component
 *
 * Progressive image loading with blur-up placeholder effect
 * Features:
 * - Low-quality image placeholder (LQIP) blur-up effect
 * - Lazy loading with Intersection Observer
 * - Smooth fade-in transition
 * - Error handling with fallback
 * - Responsive image support
 * - Terminal-themed loading state
 */

import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProgressiveImageProperties {
  /**
   * Full-quality image source
   */
  src: string;

  /**
   * Alt text for accessibility
   */
  alt: string;

  /**
   * Blur placeholder (base64 data URL)
   * If not provided, will show loading skeleton
   */
  placeholder?: string;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Additional img element props
   */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;

  /**
   * Whether to enable lazy loading
   * @default true
   */
  lazy?: boolean;

  /**
   * Intersection Observer rootMargin
   * @default '50px'
   */
  rootMargin?: string;

  /**
   * Callback when image is loaded
   */
  onLoad?: () => void;

  /**
   * Callback when image fails to load
   */
  onError?: () => void;

  /**
   * Fallback content when image fails to load
   */
  fallback?: React.ReactNode;

  /**
   * Aspect ratio for container (width / height)
   * Prevents layout shift
   */
  aspectRatio?: number;

  /**
   * Object fit style
   * @default 'cover'
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * ProgressiveImage Component
 *
 * Progressively loads images with blur-up effect for better perceived performance
 *
 * @example
 * ```tsx
 * <ProgressiveImage
 *   src="/images/high-quality.jpg"
 *   alt="Beautiful landscape"
 *   placeholder="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // 10x10px blur
 *   aspectRatio={16 / 9}
 *   lazy={true}
 * />
 * ```
 */
export function ProgressiveImage({
  src,
  alt,
  placeholder,
  className,
  imgProps: imgProperties = {},
  lazy = true,
  rootMargin = '50px',
  onLoad,
  onError,
  fallback,
  aspectRatio,
  objectFit = 'cover',
}: ProgressiveImageProperties) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgReference = useRef<HTMLImageElement>(null);
  const containerReference = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !containerReference.current) {
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
  }, [lazy, rootMargin]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  const containerStyle: React.CSSProperties = aspectRatio
    ? { paddingBottom: `${(1 / aspectRatio) * 100}%` }
    : {};

  return (
    <div
      ref={containerReference}
      className={cn(
        'relative overflow-hidden bg-gray-900',
        aspectRatio && 'h-0',
        className
      )}
      style={containerStyle}
    >
      {/* Blur Placeholder */}
      {placeholder && !isLoaded && !isError && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full blur-xl scale-110 transition-opacity duration-300',
            isInView ? 'opacity-100' : 'opacity-0'
          )}
          style={{ objectFit }}
        />
      )}

      {/* Loading Skeleton */}
      {!placeholder && !isLoaded && !isError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 animate-pulse">
          <ImageIcon size={48} className="text-gray-700" />
        </div>
      )}

      {/* Full-Quality Image */}
      {isInView && !isError && (
        <img
          ref={imgReference}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ objectFit }}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          {...imgProperties}
        />
      )}

      {/* Error State */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-gray-400">
          {fallback || (
            <>
              <AlertCircle size={48} className="mb-2 text-red-500" />
              <p className="text-sm font-mono">Failed to load image</p>
            </>
          )}
        </div>
      )}

      {/* Loading Spinner Overlay (while image is downloading) */}
      {isInView && !isLoaded && !isError && (
        <div className="absolute top-2 right-2 w-6 h-6 border-2 border-terminal-green border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}

/**
 * ProgressiveImageGrid Component
 *
 * Grid layout with progressive images
 */
interface ProgressiveImageGridProperties {
  images: Array<{
    src: string;
    alt: string;
    placeholder?: string;
  }>;
  columns?: number;
  gap?: number;
  aspectRatio?: number;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function ProgressiveImageGrid({
  images,
  columns = 3,
  gap = 4,
  aspectRatio = 1,
  className,
  onImageClick,
}: ProgressiveImageGridProperties) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {images.map((image, index) => (
        <button
          key={index}
          onClick={() => onImageClick?.(index)}
          className={cn(
            'rounded-lg overflow-hidden transition-all duration-200',
            onImageClick && 'hover:scale-105 hover:shadow-lg hover:shadow-terminal-green/20 cursor-pointer'
          )}
          disabled={!onImageClick}
        >
          <ProgressiveImage
            src={image.src}
            alt={image.alt}
            placeholder={image.placeholder}
            aspectRatio={aspectRatio}
            lazy={true}
          />
        </button>
      ))}
    </div>
  );
}
