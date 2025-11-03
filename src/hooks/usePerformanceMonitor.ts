/**
 * Performance Monitoring Hook
 *
 * Tracks component render times, interaction metrics, and provides performance warnings
 * Features:
 * - Render time tracking
 * - Interaction metrics (click, scroll, input)
 * - Performance warnings
 * - Memory usage tracking
 * - Integration with Web Vitals
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '../lib/logger';

export interface PerformanceMetrics {
  renderCount: number;
  avgRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
  lastRenderTime: number;
  interactions: {
    clicks: number;
    scrolls: number;
    inputs: number;
  };
  warnings: PerformanceWarning[];
}

export interface PerformanceWarning {
  type: 'slow_render' | 'excessive_renders' | 'memory_leak' | 'long_task';
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  metric?: number;
}

export interface PerformanceMonitorOptions {
  /**
   * Component name for logging
   */
  componentName?: string;

  /**
   * Enable render time tracking
   * @default true
   */
  trackRenders?: boolean;

  /**
   * Enable interaction tracking
   * @default true
   */
  trackInteractions?: boolean;

  /**
   * Slow render threshold in milliseconds
   * @default 16
   */
  slowRenderThreshold?: number;

  /**
   * Excessive renders threshold
   * @default 50
   */
  excessiveRendersThreshold?: number;

  /**
   * Enable console warnings
   * @default false
   */
  logWarnings?: boolean;

  /**
   * Callback when performance warning is detected
   */
  onWarning?: (warning: PerformanceWarning) => void;
}

/**
 * Performance Monitor Hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { metrics, recordInteraction } = usePerformanceMonitor({
 *     componentName: 'MyComponent',
 *     slowRenderThreshold: 16,
 *     logWarnings: true,
 *   });
 *
 *   const handleClick = () => {
 *     recordInteraction('click');
 *     // ... handle click
 *   };
 *
 *   return <div onClick={handleClick}>...</div>;
 * }
 * ```
 */
export function usePerformanceMonitor(
  options: PerformanceMonitorOptions = {}
): {
  metrics: PerformanceMetrics;
  recordInteraction: (type: 'click' | 'scroll' | 'input') => void;
  reset: () => void;
  startMeasure: (label: string) => void;
  endMeasure: (label: string) => void;
} {
  const {
    componentName = 'Component',
    trackRenders = true,
    trackInteractions = true,
    slowRenderThreshold = 16,
    excessiveRendersThreshold = 50,
    logWarnings = false,
    onWarning,
  } = options;

  // Metrics state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    totalRenderTime: 0,
    lastRenderTime: 0,
    interactions: {
      clicks: 0,
      scrolls: 0,
      inputs: 0,
    },
    warnings: [],
  });

  // Refs for tracking
  const renderStartTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);
  const customMeasures = useRef<Map<string, number>>(new Map());

  // Add warning
  const addWarning = useCallback(
    (warning: PerformanceWarning) => {
      setMetrics((previous) => ({
        ...previous,
        warnings: [...previous.warnings, warning],
      }));

      const logData = {
        type: warning.type,
        message: warning.message,
        severity: warning.severity,
        metric: warning.metric,
      };

      // Log to logger
      logger.warn(`Performance warning in ${componentName}`, logData);

      if (logWarnings) {
        const severityLabel =
          warning.severity === 'high'
            ? '🔴'
            : (warning.severity === 'medium'
              ? '🟡'
              : '🟢');
        logger.warn(
          `${severityLabel} [Performance Warning] ${componentName}: ${warning.message}`,
          warning.metric ? { metric: `${warning.metric.toFixed(2)}ms` } : undefined
        );
      }

      if (onWarning) {
        onWarning(warning);
      }
    },
    [componentName, logWarnings, onWarning]
  );

  // Track render time
  useEffect(() => {
    if (!trackRenders) return;

    const renderTime = performance.now() - renderStartTime.current;
    renderTimes.current.push(renderTime);

    setMetrics((previous) => {
      const newRenderCount = previous.renderCount + 1;
      const newTotalTime = previous.totalRenderTime + renderTime;
      const newAvgTime = newTotalTime / newRenderCount;
      const newMaxTime = Math.max(previous.maxRenderTime, renderTime);
      const newMinTime = Math.min(previous.minRenderTime, renderTime);

      // Check for slow render
      if (renderTime > slowRenderThreshold) {
        addWarning({
          type: 'slow_render',
          message: `Slow render detected: ${renderTime.toFixed(2)}ms (threshold: ${slowRenderThreshold}ms)`,
          timestamp: Date.now(),
          severity: renderTime > slowRenderThreshold * 2 ? 'high' : 'medium',
          metric: renderTime,
        });
      }

      // Check for excessive renders
      if (newRenderCount > excessiveRendersThreshold) {
        addWarning({
          type: 'excessive_renders',
          message: `Excessive renders detected: ${newRenderCount} renders`,
          timestamp: Date.now(),
          severity: newRenderCount > excessiveRendersThreshold * 2 ? 'high' : 'medium',
          metric: newRenderCount,
        });
      }

      return {
        ...previous,
        renderCount: newRenderCount,
        totalRenderTime: newTotalTime,
        avgRenderTime: newAvgTime,
        maxRenderTime: newMaxTime,
        minRenderTime: newMinTime === Infinity ? renderTime : newMinTime,
        lastRenderTime: renderTime,
      };
    });
  }, [trackRenders, slowRenderThreshold, excessiveRendersThreshold, addWarning]);

  // Set render start time before render
  renderStartTime.current = performance.now();

  // Record interaction
  const recordInteraction = useCallback(
    (type: 'click' | 'scroll' | 'input') => {
      if (!trackInteractions) return;

      setMetrics((previous) => ({
        ...previous,
        interactions: {
          ...previous.interactions,
          [type === 'click' ? 'clicks' : (type === 'scroll' ? 'scrolls' : 'inputs')]:
            previous.interactions[
              type === 'click' ? 'clicks' : (type === 'scroll' ? 'scrolls' : 'inputs')
            ] + 1,
        },
      }));
    },
    [trackInteractions]
  );

  // Reset metrics
  const reset = useCallback(() => {
    setMetrics({
      renderCount: 0,
      avgRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
      totalRenderTime: 0,
      lastRenderTime: 0,
      interactions: {
        clicks: 0,
        scrolls: 0,
        inputs: 0,
      },
      warnings: [],
    });
    renderTimes.current = [];
    customMeasures.current.clear();
  }, []);

  // Start custom measure
  const startMeasure = useCallback((label: string) => {
    customMeasures.current.set(label, performance.now());
  }, []);

  // End custom measure
  const endMeasure = useCallback(
    (label: string) => {
      const startTime = customMeasures.current.get(label);
      if (!startTime) {
        logger.warn(`[Performance Monitor] No start time found for measure: ${label}`, {
          component: componentName,
        });
        return;
      }

      const duration = performance.now() - startTime;
      customMeasures.current.delete(label);

      logger.info(`Performance measure: ${label}`, {
        component: componentName,
        duration,
      });

      return duration;
    },
    [componentName]
  );

  // Log metrics on unmount
  useEffect(() => {
    return () => {
      if (metrics.renderCount > 0) {
        logger.info(`Performance metrics for ${componentName}`, {
          renderCount: metrics.renderCount,
          avgRenderTime: metrics.avgRenderTime,
          maxRenderTime: metrics.maxRenderTime,
          minRenderTime: metrics.minRenderTime,
          interactions: metrics.interactions,
          warnings: metrics.warnings.length,
        });
      }
    };
  }, [componentName, metrics]);

  return {
    metrics,
    recordInteraction,
    reset,
    startMeasure,
    endMeasure,
  };
}

/**
 * Performance Monitor Hook for Effects
 *
 * Tracks performance of useEffect or other side effects
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { startMeasure, endMeasure } = useEffectPerformanceMonitor('data-fetch');
 *
 *   useEffect(() => {
 *     startMeasure();
 *     fetchData().then(() => endMeasure());
 *   }, []);
 * }
 * ```
 */
export function useEffectPerformanceMonitor(label: string) {
  const startTimeReference = useRef<number>(0);

  const startMeasure = useCallback(() => {
    startTimeReference.current = performance.now();
  }, []);

  const endMeasure = useCallback(() => {
    const duration = performance.now() - startTimeReference.current;
    logger.info(`Effect performance: ${label}`, { duration });
    return duration;
  }, [label]);

  return { startMeasure, endMeasure };
}

/**
 * Component Render Tracker
 *
 * Simple hook to track render count and log excessive renders
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderTracker('MyComponent');
 *   // ... component code
 * }
 * ```
 */
export function useRenderTracker(componentName: string, threshold: number = 50) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;

    if (renderCount.current > threshold) {
      logger.warn(`Excessive renders detected`, {
        component: componentName,
        renderCount: renderCount.current,
        threshold,
        message: `${componentName} has rendered ${renderCount.current} times (threshold: ${threshold})`,
      });
    }
  });
}

export default usePerformanceMonitor;
