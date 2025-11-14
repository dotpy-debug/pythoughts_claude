/**
 * Performance Optimization Utilities
 *
 * Collection of utilities for optimizing performance:
 * - Debounce and throttle
 * - Memoization helpers
 * - RAF (RequestAnimationFrame) utilities
 * - Batch updates
 * - Performance measurement
 */

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';

/**
 * Debounce function
 *
 * Delays function execution until after wait time has elapsed since last call
 */
export function debounce<T extends (...arguments_: unknown[]) => unknown>(
  function_: T,
  wait: number
): (...arguments_: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...arguments_: Parameters<T>) {
    const later = () => {
      timeout = null;
      function_(...arguments_);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 *
 * Limits function execution to once per wait time
 */
export function throttle<T extends (...arguments_: unknown[]) => unknown>(
  function_: T,
  wait: number
): (...arguments_: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastRan: number = 0;

  return function executedFunction(...arguments_: Parameters<T>) {
    if (lastRan) {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(
        () => {
          if (Date.now() - lastRan >= wait) {
            function_(...arguments_);
            lastRan = Date.now();
          }
        },
        wait - (Date.now() - lastRan)
      );
    } else {
      function_(...arguments_);
      lastRan = Date.now();
    }
  };
}

/**
 * RequestAnimationFrame throttle
 *
 * Throttles function calls to requestAnimationFrame
 */
export function rafThrottle<T extends (...arguments_: unknown[]) => unknown>(
  function_: T
): (...arguments_: Parameters<T>) => void {
  let rafId: number | null = null;

  return function executedFunction(...arguments_: Parameters<T>) {
    if (rafId !== null) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      function_(...arguments_);
      rafId = null;
    });
  };
}

/**
 * Debounce Hook
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [query, setQuery] = useState('');
 *
 *   const debouncedSearch = useDebounce((value: string) => {
 *     console.log('Searching for:', value);
 *   }, 500);
 *
 *   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     setQuery(e.target.value);
 *     debouncedSearch(e.target.value);
 *   };
 *
 *   return <input value={query} onChange={handleChange} />;
 * }
 * ```
 */
export function useDebounce<T extends (...arguments_: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...arguments_: Parameters<T>) => void {
  const timeoutReference = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }
    };
  }, []);

  return useCallback(
    (...arguments_: Parameters<T>) => {
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }

      timeoutReference.current = setTimeout(() => {
        callback(...arguments_);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Throttle Hook
 *
 * @example
 * ```tsx
 * function ScrollComponent() {
 *   const handleScroll = useThrottle(() => {
 *     console.log('Scrolled!');
 *   }, 100);
 *
 *   return <div onScroll={handleScroll}>...</div>;
 * }
 * ```
 */
export function useThrottle<T extends (...arguments_: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...arguments_: Parameters<T>) => void {
  const timeoutReference = useRef<NodeJS.Timeout | null>(null);
  const lastRan = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }
    };
  }, []);

  return useCallback(
    (...arguments_: Parameters<T>) => {
      if (lastRan.current) {
        if (timeoutReference.current) {
          clearTimeout(timeoutReference.current);
        }
        timeoutReference.current = setTimeout(
          () => {
            if (Date.now() - lastRan.current >= delay) {
              callback(...arguments_);
              lastRan.current = Date.now();
            }
          },
          delay - (Date.now() - lastRan.current)
        );
      } else {
        callback(...arguments_);
        lastRan.current = Date.now();
      }
    },
    [callback, delay]
  );
}

/**
 * RAF Throttle Hook
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const handleMove = useRAFThrottle((x: number, y: number) => {
 *     console.log('Mouse moved:', x, y);
 *   });
 *
 *   return <div onMouseMove={(e) => handleMove(e.clientX, e.clientY)}>...</div>;
 * }
 * ```
 */
export function useRAFThrottle<T extends (...arguments_: unknown[]) => unknown>(
  callback: T
): (...arguments_: Parameters<T>) => void {
  const rafIdReference = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdReference.current !== null) {
        cancelAnimationFrame(rafIdReference.current);
      }
    };
  }, []);

  return useCallback(
    (...arguments_: Parameters<T>) => {
      if (rafIdReference.current !== null) {
        return;
      }

      rafIdReference.current = requestAnimationFrame(() => {
        callback(...arguments_);
        rafIdReference.current = null;
      });
    },
    [callback]
  );
}

/**
 * Memoization utility
 *
 * Caches function results based on arguments
 */
export function memoize<T extends (...arguments_: unknown[]) => unknown>(
  function_: T,
  options: {
    maxSize?: number;
    keyFn?: (...arguments_: Parameters<T>) => string;
  } = {}
): T {
  const { maxSize = 100, keyFn: keyFunction = (...arguments_) => JSON.stringify(arguments_) } = options;

  const cache = new Map<string, ReturnType<T>>();

  return ((...arguments_: Parameters<T>): ReturnType<T> => {
    const key = keyFunction(...arguments_);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = function_(...arguments_) as ReturnType<T>;

    // Limit cache size
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value as string;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Batch updates utility
 *
 * Batches multiple state updates into a single render
 */
export class BatchUpdater<T> {
  private queue: Array<(previous: T) => T> = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private callback: (updater: (previous: T) => T) => void;

  constructor(
    callback: (updater: (previous: T) => T) => void,
    private delay: number = 16
  ) {
    this.callback = callback;
  }

  add(updater: (previous: T) => T) {
    this.queue.push(updater);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush() {
    if (this.queue.length === 0) return;

    const updates = this.queue;
    this.queue = [];

    this.callback((previous) => {
      return updates.reduce((accumulator, updater) => updater(accumulator), previous);
    });
  }

  clear() {
    this.queue = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Batch Update Hook
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *   const batchedSetCount = useBatchUpdate(setCount, 100);
 *
 *   const increment = () => {
 *     batchedSetCount((prev) => prev + 1);
 *     batchedSetCount((prev) => prev + 1);
 *     batchedSetCount((prev) => prev + 1);
 *     // All three updates batched into one render
 *   };
 *
 *   return <button onClick={increment}>Count: {count}</button>;
 * }
 * ```
 */
export function useBatchUpdate<T>(
  setter: (updater: (previous: T) => T) => void,
  delay: number = 16
): (updater: (previous: T) => T) => void {
  const batcherReference = useRef<BatchUpdater<T> | null>(null);

  if (!batcherReference.current) {
    batcherReference.current = new BatchUpdater(setter, delay);
  }

  useEffect(() => {
    return () => {
      batcherReference.current?.clear();
    };
  }, []);

  return useCallback((updater: (previous: T) => T) => {
    batcherReference.current?.add(updater);
  }, []);
}

/**
 * Performance measurement utility
 *
 * @example
 * ```tsx
 * const measure = createPerformanceMeasure('data-processing');
 *
 * measure.start();
 * // ... expensive operation
 * const duration = measure.end();
 * console.log(`Operation took ${duration}ms`);
 * ```
 */
export function createPerformanceMeasure(name: string) {
  let startTime: number = 0;
  let endTime: number = 0;

  return {
    start() {
      startTime = performance.now();
      performance.mark(`${name}-start`);
    },

    end() {
      endTime = performance.now();
      performance.mark(`${name}-end`);

      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Measure failed - log for debugging
        console.warn('Performance measure failed:', error);
      }

      return endTime - startTime;
    },

    getDuration() {
      return endTime - startTime;
    },

    clear() {
      try {
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
      } catch (error) {
        // Clear failed - log for debugging
        console.warn('Performance clear failed:', error);
      }
    },
  };
}

/**
 * Performance Measure Hook
 *
 * @example
 * ```tsx
 * function DataProcessor() {
 *   const { start, end, duration } = usePerformanceMeasure('data-processing');
 *
 *   const processData = async () => {
 *     start();
 *     await expensiveOperation();
 *     const time = end();
 *     console.log(`Processing took ${time}ms`);
 *   };
 *
 *   return <div>Last processing time: {duration}ms</div>;
 * }
 * ```
 */
export function usePerformanceMeasure(name: string) {
  const [duration, setDuration] = useState<number>(0);

  const measure = useMemo(() => createPerformanceMeasure(name), [name]);

  const start = useCallback(() => {
    measure.start();
  }, [measure]);

  const end = useCallback(() => {
    const time = measure.end();
    setDuration(time);
    return time;
  }, [measure]);

  useEffect(() => {
    return () => {
      measure.clear();
    };
  }, [measure]);

  return { start, end, duration };
}

/**
 * Idle Callback Hook
 *
 * Executes callback during browser idle time
 *
 * @example
 * ```tsx
 * function Analytics() {
 *   useIdleCallback(() => {
 *     // Send analytics during idle time
 *     sendAnalytics();
 *   }, []);
 * }
 * ```
 */
export function useIdleCallback(callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    if ('requestIdleCallback' in globalThis) {
      const id = requestIdleCallback(callback);
      return () => cancelIdleCallback(id);
    } else {
      // Fallback to setTimeout
      const id = setTimeout(callback, 1);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Optimized Resize Hook
 *
 * Handles window resize events with throttling
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { width, height } = useOptimizedResize();
 *
 *   return <div>Window size: {width}x{height}</div>;
 * }
 * ```
 */
export function useOptimizedResize(): { width: number; height: number } {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const handleResize = useRAFThrottle(() => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return size;
}

/**
 * Optimized Scroll Hook
 *
 * Handles scroll events with throttling
 *
 * @example
 * ```tsx
 * function ScrollComponent() {
 *   const { scrollY, scrollX } = useOptimizedScroll();
 *
 *   return <div>Scroll position: {scrollY}px</div>;
 * }
 * ```
 */
export function useOptimizedScroll(): { scrollX: number; scrollY: number } {
  const [scroll, setScroll] = useState({
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  });

  const handleScroll = useRAFThrottle(() => {
    setScroll({
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
  });

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return scroll;
}
