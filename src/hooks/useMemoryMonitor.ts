/**
 * Memory Monitoring Hook
 *
 * Tracks memory usage and detects potential memory leaks
 * Features:
 * - Heap size tracking
 * - Memory leak detection
 * - Memory pressure warnings
 * - Cleanup recommendations
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';

// TypeScript type definitions for Performance Memory API
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

interface WindowWithGC extends Window {
  gc?: () => void;
}

export interface MemoryMetrics {
  usedJSHeapSize: number; // Bytes
  totalJSHeapSize: number; // Bytes
  jsHeapSizeLimit: number; // Bytes
  usedPercentage: number; // 0-100
  timestamp: number;
}

export interface MemoryMonitorOptions {
  /**
   * Polling interval in milliseconds
   * @default 5000
   */
  interval?: number;

  /**
   * Warning threshold percentage (0-100)
   * @default 80
   */
  warningThreshold?: number;

  /**
   * Critical threshold percentage (0-100)
   * @default 90
   */
  criticalThreshold?: number;

  /**
   * Enable console logging
   * @default false
   */
  logToConsole?: boolean;

  /**
   * Callback when memory warning is triggered
   */
  onWarning?: (metrics: MemoryMetrics, level: 'warning' | 'critical') => void;

  /**
   * Callback when potential leak is detected
   */
  onLeakDetected?: (growthRate: number) => void;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, index)).toFixed(2))} ${sizes[index]}`;
}

/**
 * Get current memory metrics
 */
function getMemoryMetrics(): MemoryMetrics | null {
  const performanceWithMemory = performance as PerformanceWithMemory;

  if (!performanceWithMemory.memory) {
    return null;
  }

  const memory = performanceWithMemory.memory;
  const usedPercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usedPercentage,
    timestamp: Date.now(),
  };
}

/**
 * Memory Monitor Hook
 *
 * @example
 * ```tsx
 * function App() {
 *   const { metrics, history, isSupported } = useMemoryMonitor({
 *     interval: 5000,
 *     warningThreshold: 80,
 *     criticalThreshold: 90,
 *     logToConsole: true,
 *     onWarning: (metrics, level) => {
 *       console.warn(`Memory ${level}: ${metrics.usedPercentage.toFixed(2)}%`);
 *     },
 *     onLeakDetected: (growthRate) => {
 *       console.error(`Potential memory leak detected! Growth rate: ${growthRate}MB/min`);
 *     },
 *   });
 *
 *   if (!isSupported) {
 *     return <div>Memory monitoring not supported</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Used: {formatBytes(metrics?.usedJSHeapSize || 0)}</p>
 *       <p>Total: {formatBytes(metrics?.totalJSHeapSize || 0)}</p>
 *       <p>Usage: {metrics?.usedPercentage.toFixed(2)}%</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMemoryMonitor(
  options: MemoryMonitorOptions = {}
): {
  metrics: MemoryMetrics | null;
  history: MemoryMetrics[];
  isSupported: boolean;
  forceGC: () => void;
} {
  const {
    interval = 5000,
    warningThreshold = 80,
    criticalThreshold = 90,
    logToConsole = false,
    onWarning,
    onLeakDetected,
  } = options;

  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  const [history, setHistory] = useState<MemoryMetrics[]>([]);
  const [isSupported] = useState(() => {
    const performanceWithMemory = performance as PerformanceWithMemory;
    return performanceWithMemory.memory !== undefined;
  });

  const intervalReference = useRef<NodeJS.Timeout | null>(null);
  const lastWarningReference = useRef<number>(0);
  const warningCooldown = 30_000; // 30 seconds

  // Check for memory leaks
  const checkForLeaks = useCallback(
    (history: MemoryMetrics[]) => {
      if (history.length < 6) return; // Need at least 6 samples (30 seconds of data)

      // Get last 6 samples
      const recentSamples = history.slice(-6);
      const firstSample = recentSamples[0];
      const lastSample = recentSamples.at(-1);

      if (!lastSample) return;

      // Calculate growth rate (MB per minute)
      const timeDiff = (lastSample.timestamp - firstSample.timestamp) / 1000 / 60; // minutes
      const memoryDiff =
        (lastSample.usedJSHeapSize - firstSample.usedJSHeapSize) / 1024 / 1024; // MB
      const growthRate = memoryDiff / timeDiff;

      // If growing consistently at > 5MB/min, might be a leak
      if (growthRate > 5) {
        // Check if all samples show growth
        let consistentGrowth = true;
        for (let index = 1; index < recentSamples.length; index++) {
          if (recentSamples[index].usedJSHeapSize <= recentSamples[index - 1].usedJSHeapSize) {
            consistentGrowth = false;
            break;
          }
        }

        if (consistentGrowth) {
          logger.warn('Potential memory leak detected', {
            growthRate: `${growthRate.toFixed(2)} MB/min`,
            currentUsage: formatBytes(lastSample.usedJSHeapSize),
            usagePercentage: `${lastSample.usedPercentage.toFixed(2)}%`,
          });

          if (onLeakDetected) {
            onLeakDetected(growthRate);
          }
        }
      }
    },
    [onLeakDetected]
  );

  // Update metrics
  const updateMetrics = useCallback(() => {
    const newMetrics = getMemoryMetrics();
    if (!newMetrics) return;

    setMetrics(newMetrics);
    setHistory((previous) => {
      const newHistory = [...previous, newMetrics];
      // Keep last 60 samples (5 minutes of data at 5s intervals)
      if (newHistory.length > 60) {
        newHistory.shift();
      }

      // Check for leaks
      checkForLeaks(newHistory);

      return newHistory;
    });

    // Check thresholds
    const now = Date.now();
    if (now - lastWarningReference.current < warningCooldown) {
      return; // Cooldown period
    }

    if (newMetrics.usedPercentage >= criticalThreshold) {
      const criticalMessage = 'Critical memory usage';
      const criticalData = {
        usedPercentage: newMetrics.usedPercentage,
        used: formatBytes(newMetrics.usedJSHeapSize),
        total: formatBytes(newMetrics.totalJSHeapSize),
        limit: formatBytes(newMetrics.jsHeapSizeLimit),
      };

      logger.error(criticalMessage, criticalData);

      if (logToConsole) {
        logger.error(
          `🔴 [Memory Monitor] CRITICAL: Memory usage at ${newMetrics.usedPercentage.toFixed(2)}%`,
          criticalData
        );
      }

      if (onWarning) {
        onWarning(newMetrics, 'critical');
      }

      lastWarningReference.current = now;
    } else if (newMetrics.usedPercentage >= warningThreshold) {
      const warningMessage = 'High memory usage';
      const warningData = {
        usedPercentage: newMetrics.usedPercentage,
        used: formatBytes(newMetrics.usedJSHeapSize),
        total: formatBytes(newMetrics.totalJSHeapSize),
      };

      logger.warn(warningMessage, warningData);

      if (logToConsole) {
        logger.warn(
          `⚠️ [Memory Monitor] WARNING: Memory usage at ${newMetrics.usedPercentage.toFixed(2)}%`,
          warningData
        );
      }

      if (onWarning) {
        onWarning(newMetrics, 'warning');
      }

      lastWarningReference.current = now;
    }
  }, [
    checkForLeaks,
    criticalThreshold,
    logToConsole,
    onWarning,
    warningThreshold,
  ]);

  // Start monitoring
  useEffect(() => {
    if (!isSupported) return;

    // Initial measurement
    updateMetrics();

    // Start polling
    intervalReference.current = setInterval(updateMetrics, interval);

    return () => {
      if (intervalReference.current) {
        clearInterval(intervalReference.current);
      }
    };
  }, [isSupported, interval, updateMetrics]);

  // Force garbage collection (if available)
  const forceGC = useCallback(() => {
    const windowWithGC = globalThis as unknown as WindowWithGC;

    if (windowWithGC.gc && typeof windowWithGC.gc === 'function') {
      windowWithGC.gc();
      logger.info('Forced garbage collection');

      // Update metrics after GC
      setTimeout(updateMetrics, 100);
    } else {
      logger.warn('Garbage collection not available (run Chrome with --expose-gc flag)');
    }
  }, [updateMetrics]);

  return {
    metrics,
    history,
    isSupported,
    forceGC,
  };
}

/**
 * Memory Leak Detector Hook
 *
 * Simplified hook that only detects memory leaks without tracking all metrics
 *
 * @example
 * ```tsx
 * function App() {
 *   useMemoryLeakDetector({
 *     onLeakDetected: (growthRate) => {
 *       alert(`Memory leak detected! Growth: ${growthRate}MB/min`);
 *     },
 *   });
 * }
 * ```
 */
export function useMemoryLeakDetector(options: {
  onLeakDetected?: (growthRate: number) => void;
} = {}) {
  useMemoryMonitor({
    interval: 5000,
    logToConsole: false,
    onLeakDetected: options.onLeakDetected,
  });
}

export { formatBytes };
export default useMemoryMonitor;
