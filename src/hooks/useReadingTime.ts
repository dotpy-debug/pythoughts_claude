import { useEffect, useRef, useState, useCallback } from 'react';
import Analytics from '../lib/analytics';

export type ReadingTimeTrackerOptions = {
  postId: string;
  userId?: string;
  onMilestone?: (milestone: number) => void; // Callback for milestones (25%, 50%, 75%, 100%)
  updateInterval?: number; // How often to update (in ms)
};

/**
 * Hook for tracking reading time and scroll progress
 * Automatically tracks how long a user spends reading a post and how far they scroll
 */
export function useReadingTime(options: ReadingTimeTrackerOptions) {
  const { postId, userId, onMilestone, updateInterval = 5000 } = options;

  const [readTime, setReadTime] = useState(0);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [isReading, setIsReading] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const totalReadTimeRef = useRef(0);
  const milestonesReachedRef = useRef<Set<number>>(new Set());

  /**
   * Calculate scroll percentage
   */
  const calculateScrollPercentage = useCallback((): number => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;

    const scrollableHeight = documentHeight - windowHeight;
    if (scrollableHeight <= 0) return 100;

    const percentage = Math.round((scrollTop / scrollableHeight) * 100);
    return Math.min(100, Math.max(0, percentage));
  }, []);

  /**
   * Start tracking reading time
   */
  const startReading = useCallback(() => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      setIsReading(true);
    }
  }, []);

  /**
   * Stop tracking reading time
   */
  const stopReading = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      totalReadTimeRef.current += elapsed;
      setReadTime(totalReadTimeRef.current);
      startTimeRef.current = null;
      setIsReading(false);
    }
  }, []);

  /**
   * Update analytics
   */
  const updateAnalytics = useCallback(() => {
    const now = Date.now();

    // Only update if enough time has passed
    if (now - lastUpdateRef.current < updateInterval) {
      return;
    }

    const currentReadTime = Math.floor(totalReadTimeRef.current / 1000); // Convert to seconds
    const currentScrollPercentage = calculateScrollPercentage();

    // Track reading progress
    Analytics.trackReadingProgress(postId, currentScrollPercentage, currentReadTime);

    lastUpdateRef.current = now;
  }, [postId, updateInterval, calculateScrollPercentage]);

  /**
   * Check for milestones
   */
  const checkMilestones = useCallback(
    (percentage: number) => {
      const milestones = [25, 50, 75, 100];

      for (const milestone of milestones) {
        if (
          percentage >= milestone &&
          !milestonesReachedRef.current.has(milestone)
        ) {
          milestonesReachedRef.current.add(milestone);

          // Call milestone callback
          if (onMilestone) {
            onMilestone(milestone);
          }

          // Track milestone event
          Analytics.trackEvent({
            name: 'reading_milestone',
            category: 'engagement',
            properties: {
              post_id: postId,
              milestone,
              read_time: Math.floor(totalReadTimeRef.current / 1000),
            },
            value: milestone,
          });
        }
      }
    },
    [postId, onMilestone]
  );

  /**
   * Handle scroll events
   */
  useEffect(() => {
    const handleScroll = () => {
      const percentage = calculateScrollPercentage();
      setScrollPercentage(percentage);
      checkMilestones(percentage);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [calculateScrollPercentage, checkMilestones]);

  /**
   * Handle visibility changes (page focus/blur)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopReading();
      } else {
        startReading();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start tracking on mount
    startReading();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopReading();
    };
  }, [startReading, stopReading]);

  /**
   * Periodically update analytics
   */
  useEffect(() => {
    if (!isReading) return;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        const currentTotal = totalReadTimeRef.current + elapsed;
        setReadTime(currentTotal);
        updateAnalytics();
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isReading, updateAnalytics]);

  /**
   * Final update on unmount
   */
  useEffect(() => {
    return () => {
      stopReading();
      updateAnalytics();
    };
  }, [stopReading, updateAnalytics]);

  return {
    readTime: Math.floor(readTime / 1000), // Return in seconds
    scrollPercentage,
    isReading,
  };
}

/**
 * Hook for tracking post views
 * Automatically tracks a view when the component mounts
 */
export function usePostView(postId: string, userId?: string) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) return;

    // Track the post view
    Analytics.trackPostView({
      postId,
      userId,
      sessionId: Analytics.getSessionId(),
    });

    // Track referral if UTM params present
    const utmParams = Analytics.parseUTMParams();
    if (Object.keys(utmParams).length > 0) {
      Analytics.trackReferral(postId, utmParams);
    }

    hasTrackedRef.current = true;
  }, [postId, userId]);
}

/**
 * Format reading time for display
 */
export function formatReadingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}
