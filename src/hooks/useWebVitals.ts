/**
 * Web Vitals Tracking Hook
 *
 * Tracks Core Web Vitals metrics using the web-vitals library
 * Metrics tracked:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */

import { useEffect, useState, useCallback } from 'react';
import { logger } from '../lib/logger';

// TypeScript interfaces for Performance API entries
interface LargestContentfulPaintEntry extends PerformanceEntry {
  renderTime: number;
  loadTime: number;
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface EventTimingEntry extends PerformanceEntry {
  duration: number;
}

// Type guard for PerformanceObserver options
interface PerformanceObserverInit {
  type?: string;
  buffered?: boolean;
  durationThreshold?: number;
}

export interface WebVitalsMetrics {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  inp: number | null; // Interaction to Next Paint
}

export interface WebVitalsRating {
  lcp: 'good' | 'needs-improvement' | 'poor' | null;
  fid: 'good' | 'needs-improvement' | 'poor' | null;
  cls: 'good' | 'needs-improvement' | 'poor' | null;
  fcp: 'good' | 'needs-improvement' | 'poor' | null;
  ttfb: 'good' | 'needs-improvement' | 'poor' | null;
  inp: 'good' | 'needs-improvement' | 'poor' | null;
}

export interface WebVitalsOptions {
  /**
   * Enable analytics reporting
   * @default true
   */
  reportToAnalytics?: boolean;

  /**
   * Enable console logging
   * @default false
   */
  logToConsole?: boolean;

  /**
   * Callback when metric is captured
   */
  onMetric?: (metric: { name: string; value: number; rating: string }) => void;
}

/**
 * Get rating for LCP (Largest Contentful Paint)
 * Good: < 2.5s, Needs Improvement: 2.5s - 4s, Poor: > 4s
 */
function getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 2500) return 'good';
  if (value <= 4000) return 'needs-improvement';
  return 'poor';
}

/**
 * Get rating for FID (First Input Delay)
 * Good: < 100ms, Needs Improvement: 100ms - 300ms, Poor: > 300ms
 */
function getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 100) return 'good';
  if (value <= 300) return 'needs-improvement';
  return 'poor';
}

/**
 * Get rating for CLS (Cumulative Layout Shift)
 * Good: < 0.1, Needs Improvement: 0.1 - 0.25, Poor: > 0.25
 */
function getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 0.1) return 'good';
  if (value <= 0.25) return 'needs-improvement';
  return 'poor';
}

/**
 * Get rating for FCP (First Contentful Paint)
 * Good: < 1.8s, Needs Improvement: 1.8s - 3s, Poor: > 3s
 */
function getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 1800) return 'good';
  if (value <= 3000) return 'needs-improvement';
  return 'poor';
}

/**
 * Get rating for TTFB (Time to First Byte)
 * Good: < 800ms, Needs Improvement: 800ms - 1800ms, Poor: > 1800ms
 */
function getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 800) return 'good';
  if (value <= 1800) return 'needs-improvement';
  return 'poor';
}

/**
 * Get rating for INP (Interaction to Next Paint)
 * Good: < 200ms, Needs Improvement: 200ms - 500ms, Poor: > 500ms
 */
function getINPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 200) return 'good';
  if (value <= 500) return 'needs-improvement';
  return 'poor';
}

/**
 * Web Vitals Hook
 *
 * @example
 * ```tsx
 * function App() {
 *   const { metrics, ratings } = useWebVitals({
 *     reportToAnalytics: true,
 *     logToConsole: true,
 *     onMetric: (metric) => {
 *       console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <p>LCP: {metrics.lcp}ms ({ratings.lcp})</p>
 *       <p>FID: {metrics.fid}ms ({ratings.fid})</p>
 *       <p>CLS: {metrics.cls} ({ratings.cls})</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebVitals(
  options: WebVitalsOptions = {}
): {
  metrics: WebVitalsMetrics;
  ratings: WebVitalsRating;
} {
  const { reportToAnalytics = true, logToConsole = false, onMetric } = options;

  const [metrics, setMetrics] = useState<WebVitalsMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
  });

  const [ratings, setRatings] = useState<WebVitalsRating>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
  });

  const reportMetric = useCallback(
    (name: string, value: number, rating: string) => {
      // Update state
      setMetrics((previous) => ({ ...previous, [name.toLowerCase()]: value }));
      setRatings((previous) => ({ ...previous, [name.toLowerCase()]: rating }));

      // Log to logger
      const emoji = rating === 'good' ? '✅' : (rating === 'needs-improvement' ? '⚠️' : '❌');
      const unit = name === 'cls' ? '' : 'ms';

      if (logToConsole) {
        logger.info(`${emoji} [Web Vitals] ${name}: ${value.toFixed(2)}${unit} (${rating})`, {
          metric: name,
          value,
          rating,
        });
      }

      // Report to analytics
      if (reportToAnalytics) {
        logger.info('Web Vital metric captured', {
          metric: name,
          value,
          rating,
          url: globalThis.location.href,
        });
      }

      // Callback
      if (onMetric) {
        onMetric({ name, value, rating });
      }
    },
    [logToConsole, reportToAnalytics, onMetric]
  );

  useEffect(() => {
    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries.at(-1) as LargestContentfulPaintEntry;
      const value = lastEntry.renderTime || lastEntry.loadTime;
      const rating = getLCPRating(value);
      reportMetric('LCP', value, rating);
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit);
    } catch (error) {
      // LCP not supported
      logger.debug('LCP metric not supported in this browser', { error });
    }

    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const firstInput = entries[0] as FirstInputEntry;
      const value = firstInput.processingStart - firstInput.startTime;
      const rating = getFIDRating(value);
      reportMetric('FID', value, rating);
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true } as PerformanceObserverInit);
    } catch (error) {
      // FID not supported
      logger.debug('FID metric not supported in this browser', { error });
    }

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShiftEntry = entry as LayoutShiftEntry;
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
      const rating = getCLSRating(clsValue);
      reportMetric('CLS', clsValue, rating);
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit);
    } catch (error) {
      // CLS not supported
      logger.debug('CLS metric not supported in this browser', { error });
    }

    // FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        const value = fcpEntry.startTime;
        const rating = getFCPRating(value);
        reportMetric('FCP', value, rating);
      }
    });

    try {
      fcpObserver.observe({ type: 'paint', buffered: true } as PerformanceObserverInit);
    } catch (error) {
      // FCP not supported
      logger.debug('FCP metric not supported in this browser', { error });
    }

    // TTFB (Time to First Byte)
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      const value = navEntry.responseStart - navEntry.requestStart;
      const rating = getTTFBRating(value);
      reportMetric('TTFB', value, rating);
    }

    // INP (Interaction to Next Paint) - newer metric
    const inpObserver = new PerformanceObserver((entryList) => {
      let maxDuration = 0;
      for (const entry of entryList.getEntries()) {
        const eventEntry = entry as EventTimingEntry;
        if (eventEntry.duration > maxDuration) {
          maxDuration = eventEntry.duration;
        }
      }
      if (maxDuration > 0) {
        const rating = getINPRating(maxDuration);
        reportMetric('INP', maxDuration, rating);
      }
    });

    try {
      inpObserver.observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16
      } as PerformanceObserverInit);
    } catch (error) {
      // INP not supported
      logger.debug('INP metric not supported in this browser', { error });
    }

    // Cleanup
    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      fcpObserver.disconnect();
      inpObserver.disconnect();
    };
  }, [reportMetric]);

  return { metrics, ratings };
}

/**
 * Simple Web Vitals Reporter
 *
 * Reports Web Vitals to console and analytics without returning state
 *
 * @example
 * ```tsx
 * function App() {
 *   useWebVitalsReporter();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useWebVitalsReporter() {
  useWebVitals({
    reportToAnalytics: true,
    logToConsole: process.env.NODE_ENV === 'development',
  });
}

export default useWebVitals;
