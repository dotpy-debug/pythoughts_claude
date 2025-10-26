import { useEffect, useRef } from 'react';
import { publishScheduledPosts } from '../utils/scheduledPosts';
import { logger } from '../lib/logger';

/**
 * Hook to periodically check and publish scheduled posts
 * This runs client-side as a fallback - in production, use a server-side cron job
 *
 * @param intervalMinutes - How often to check (default: 1 minute)
 * @param enabled - Whether to enable the publisher (default: true)
 */
export function useScheduledPostsPublisher(intervalMinutes: number = 1, enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    const checkAndPublish = async () => {
      try {
        const publishedCount = await publishScheduledPosts();
        if (publishedCount > 0) {
          logger.info('Scheduled posts published', { count: publishedCount });
        }
      } catch (error) {
        logger.error('Error in scheduled posts publisher', { errorDetails: error });
      }
    };

    // Run immediately on mount
    checkAndPublish();

    // Then run periodically
    intervalRef.current = setInterval(checkAndPublish, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes, enabled]);
}
