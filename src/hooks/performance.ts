/**
 * Performance Hooks
 *
 * Export all performance-related hooks
 */

// Performance Monitor
export {
  usePerformanceMonitor,
  useEffectPerformanceMonitor,
  useRenderTracker,
  type PerformanceMetrics,
  type PerformanceWarning,
  type PerformanceMonitorOptions,
} from './usePerformanceMonitor';

// Web Vitals
export {
  useWebVitals,
  useWebVitalsReporter,
  type WebVitalsMetrics,
  type WebVitalsRating,
  type WebVitalsOptions,
} from './useWebVitals';

// Memory Monitor
export {
  useMemoryMonitor,
  useMemoryLeakDetector,
  formatBytes,
  type MemoryMetrics,
  type MemoryMonitorOptions,
} from './useMemoryMonitor';

// Lazy Loading
export {
  useLazyLoad,
  useLazyLoadImage,
  usePreloadImages,
  useLazyLoadList,
  useLinkPrefetch,
  type LazyLoadOptions,
} from './useLazyLoad';
