/**
 * Advanced Lazy Loading Hook
 *
 * IntersectionObserver-based lazy loading with preloading and priority support
 * Features:
 * - Intersection observer for viewport detection
 * - Configurable root margin and threshold
 * - Image lazy loading with blur placeholder
 * - Component lazy loading
 * - Preloading support
 * - Priority loading
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '../lib/logger';

// Type definitions for fetch priority (experimental API)
interface HTMLImageElementWithFetchPriority extends HTMLImageElement {
  fetchPriority: 'high' | 'low' | 'auto';
}

interface HTMLLinkElementWithFetchPriority extends HTMLLinkElement {
  fetchPriority: 'high' | 'low' | 'auto';
}

export interface LazyLoadOptions {
  /**
   * Root margin for intersection observer
   * @default "200px"
   */
  rootMargin?: string;

  /**
   * Intersection threshold (0-1)
   * @default 0.01
   */
  threshold?: number;

  /**
   * Callback when element enters viewport
   */
  onEnter?: () => void;

  /**
   * Callback when element exits viewport
   */
  onExit?: () => void;

  /**
   * Enable preloading (load before entering viewport)
   * @default false
   */
  preload?: boolean;

  /**
   * Priority for loading (higher = sooner)
   * @default 0
   */
  priority?: number;

  /**
   * Disable lazy loading (always load)
   * @default false
   */
  disabled?: boolean;
}

/**
 * Lazy Load Hook
 *
 * @example
 * ```tsx
 * function LazyImage({ src, alt }: { src: string; alt: string }) {
 *   const { ref, isVisible } = useLazyLoad({
 *     rootMargin: '200px',
 *     threshold: 0.01,
 *     onEnter: () => console.log('Image entered viewport'),
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {isVisible && <img src={src} alt={alt} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoad(options: LazyLoadOptions = {}): {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
  entry: IntersectionObserverEntry | null;
} {
  const {
    rootMargin = '200px',
    threshold = 0.01,
    onEnter,
    onExit,
    preload = false,
    disabled = false,
  } = options;

  const [_isVisible, setIsVisible] = useState(disabled);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const ref = useRef<HTMLElement>(null);
  const hasEntered = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setEntry(entry);

        if (entry.isIntersecting) {
          if (!hasEntered.current) {
            hasEntered.current = true;
            setIsVisible(true);

            if (onEnter) {
              onEnter();
            }

            logger.debug('Lazy load: element entered viewport', {
              elementType: element.tagName,
            });
          }
        } else {
          if (onExit) {
            onExit();
          }
        }
      },
      {
        rootMargin: preload ? `${parseInt(rootMargin) * 2}px` : rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, onEnter, onExit, preload, disabled]);

  return { ref, isVisible: _isVisible, entry };
}

/**
 * Lazy Load Image Hook
 *
 * Specialized hook for lazy loading images with blur placeholder
 *
 * @example
 * ```tsx
 * function LazyImage({ src, alt }: { src: string; alt: string }) {
 *   const { ref, imageSrc, isLoaded, isError } = useLazyLoadImage(src, {
 *     placeholder: 'data:image/svg+xml;base64,...',
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       <img
 *         src={imageSrc}
 *         alt={alt}
 *         className={isLoaded ? 'loaded' : 'loading'}
 *       />
 *       {isError && <p>Failed to load image</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoadImage(
  src: string,
  options: LazyLoadOptions & {
    placeholder?: string;
    onLoad?: () => void;
    onError?: (error: Error) => void;
  } = {}
): {
  ref: React.RefObject<HTMLElement>;
  imageSrc: string;
  isLoaded: boolean;
  isError: boolean;
} {
  const { placeholder, onLoad, onError, ...lazyOptions } = options;

  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const { ref, isVisible: _isVisible } = useLazyLoad({
    ...lazyOptions,
    onEnter: () => {
      // Start loading image
      const img = new Image();

      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
        if (onLoad) {
          onLoad();
        }
        logger.debug('Lazy load: image loaded', { src });
      };

      img.onerror = () => {
        setIsError(true);
        const error = new Error(`Failed to load image: ${src}`);
        if (onError) {
          onError(error);
        }
        logger.error('Lazy load: image failed', { src, error });
      };

      img.src = src;

      if (lazyOptions.onEnter) {
        lazyOptions.onEnter();
      }
    },
  });

  // If disabled, load immediately
  useEffect(() => {
    if (options.disabled) {
      setImageSrc(src);
      setIsLoaded(true);
    }
  }, [options.disabled, src]);

  return { ref, imageSrc, isLoaded, isError };
}

/**
 * Preload images in the background
 *
 * @example
 * ```tsx
 * function Gallery() {
 *   const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
 *
 *   usePreloadImages(images, {
 *     priority: 1,
 *     onComplete: () => console.log('All images preloaded'),
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function usePreloadImages(
  urls: string[],
  options: {
    priority?: number;
    onComplete?: () => void;
    onError?: (url: string, error: Error) => void;
  } = {}
): {
  loaded: number;
  total: number;
  progress: number;
} {
  const { priority = 0, onComplete, onError } = options;

  const [loaded, setLoaded] = useState(0);
  const [total] = useState(urls.length);

  useEffect(() => {
    if (urls.length === 0) return;

    let loadedCount = 0;

    urls.forEach((url) => {
      const img = new Image();

      img.onload = () => {
        loadedCount++;
        setLoaded(loadedCount);

        if (loadedCount === urls.length && onComplete) {
          onComplete();
          logger.info('Preload: all images loaded', { count: urls.length });
        }
      };

      img.onerror = () => {
        loadedCount++;
        setLoaded(loadedCount);

        const error = new Error(`Failed to preload image: ${url}`);
        if (onError) {
          onError(url, error);
        }
        logger.error('Preload: image failed', { url, error });
      };

      // Set priority hint if supported
      const imgWithPriority = img as HTMLImageElementWithFetchPriority;
      if ('fetchPriority' in img) {
        imgWithPriority.fetchPriority = priority > 0 ? 'high' : 'low';
      }

      img.src = url;
    });
  }, [urls, priority, onComplete, onError]);

  return {
    loaded,
    total,
    progress: total > 0 ? (loaded / total) * 100 : 0,
  };
}

/**
 * Lazy Load List Hook
 *
 * Load items progressively as user scrolls
 *
 * @example
 * ```tsx
 * function InfiniteList({ allItems }: { allItems: Item[] }) {
 *   const { items, loadMore, hasMore, isLoading } = useLazyLoadList(allItems, {
 *     pageSize: 20,
 *     initialPage: 1,
 *   });
 *
 *   const { ref } = useLazyLoad({
 *     onEnter: loadMore,
 *   });
 *
 *   return (
 *     <div>
 *       {items.map((item) => <ItemCard key={item.id} item={item} />)}
 *       {hasMore && <div ref={ref}>Loading...</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoadList<T>(
  allItems: T[],
  options: {
    pageSize?: number;
    initialPage?: number;
  } = {}
): {
  items: T[];
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  reset: () => void;
} {
  const { pageSize = 20, initialPage = 1 } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  const items = allItems.slice(0, currentPage * pageSize);
  const hasMore = items.length < allItems.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);

    // Simulate async loading
    setTimeout(() => {
      setCurrentPage((prev) => prev + 1);
      setIsLoading(false);
      logger.debug('Lazy load: loaded more items', {
        page: currentPage + 1,
        itemsLoaded: Math.min(pageSize, allItems.length - items.length),
      });
    }, 100);
  }, [hasMore, isLoading, currentPage, pageSize, allItems.length, items.length]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setIsLoading(false);
  }, [initialPage]);

  return {
    items,
    loadMore,
    hasMore,
    isLoading,
    reset,
  };
}

/**
 * Link Prefetch Hook
 *
 * Prefetch links when they enter viewport or on hover
 *
 * @example
 * ```tsx
 * function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
 *   const { ref, onMouseEnter } = useLinkPrefetch(to, {
 *     strategy: 'hover',
 *   });
 *
 *   return (
 *     <a href={to} ref={ref} onMouseEnter={onMouseEnter}>
 *       {children}
 *     </a>
 *   );
 * }
 * ```
 */
export function useLinkPrefetch(
  href: string,
  options: {
    strategy?: 'hover' | 'visible' | 'both';
    priority?: number;
  } = {}
): {
  ref: React.RefObject<HTMLAnchorElement>;
  onMouseEnter: () => void;
} {
  const { strategy = 'visible', priority = 0 } = options;

  const ref = useRef<HTMLAnchorElement>(null);
  const hasPrefetched = useRef(false);

  const prefetch = useCallback(() => {
    if (hasPrefetched.current) return;

    hasPrefetched.current = true;

    // Create prefetch link
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;

    const linkWithPriority = link as HTMLLinkElementWithFetchPriority;
    if ('fetchPriority' in link && priority > 0) {
      linkWithPriority.fetchPriority = 'high';
    }

    document.head.appendChild(link);

    logger.debug('Link prefetch: started', { href, strategy });
  }, [href, priority, strategy]);

  // Prefetch on visible
  useLazyLoad({
    rootMargin: '400px',
    threshold: 0.01,
    onEnter: () => {
      if (strategy === 'visible' || strategy === 'both') {
        prefetch();
      }
    },
    disabled: strategy === 'hover',
  });

  // Prefetch on hover
  const onMouseEnter = useCallback(() => {
    if (strategy === 'hover' || strategy === 'both') {
      prefetch();
    }
  }, [strategy, prefetch]);

  return { ref, onMouseEnter };
}

export default useLazyLoad;
