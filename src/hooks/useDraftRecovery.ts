import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../lib/logger';

export interface DraftData {
  title: string;
  content: string;
  subtitle?: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
  postType: 'news' | 'blog';
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'draft_recovery_';
const RECOVERY_EXPIRY_HOURS = 24;

export function useDraftRecovery(
  postType: 'news' | 'blog',
  draftId?: string
) {
  const hasShownRecoveryPrompt = useRef(false);

  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY_PREFIX}${postType}_${draftId || 'new'}`;
  }, [postType, draftId]);

  /**
   * Save draft to localStorage
   */
  const saveDraftBackup = useCallback((data: Omit<DraftData, 'postType' | 'timestamp'>) => {
    try {
      const draftData: DraftData = {
        ...data,
        postType,
        timestamp: Date.now(),
      };

      localStorage.setItem(getStorageKey(), JSON.stringify(draftData));
      logger.info('Draft backup saved to localStorage', { key: getStorageKey() });
    } catch (error) {
      logger.error('Error saving draft backup', { errorDetails: error });
    }
  }, [postType, getStorageKey]);

  /**
   * Clear draft from localStorage
   */
  const clearDraftBackup = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      logger.info('Draft backup cleared', { key: getStorageKey() });
    } catch (error) {
      logger.error('Error clearing draft backup', { errorDetails: error });
    }
  }, [getStorageKey]);

  /**
   * Load draft from localStorage
   */
  const loadDraftBackup = useCallback((): DraftData | null => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;

      const draftData: DraftData = JSON.parse(stored);

      // Check if draft is expired (older than 24 hours)
      const ageHours = (Date.now() - draftData.timestamp) / (1000 * 60 * 60);
      if (ageHours > RECOVERY_EXPIRY_HOURS) {
        logger.info('Draft backup expired, removing', { ageHours });
        clearDraftBackup();
        return null;
      }

      return draftData;
    } catch (error) {
      logger.error('Error loading draft backup', { errorDetails: error });
      return null;
    }
  }, [getStorageKey, clearDraftBackup]);

  /**
   * Check if there's a recoverable draft
   */
  const hasRecoverableDraft = useCallback((): boolean => {
    const draft = loadDraftBackup();
    return draft !== null;
  }, [loadDraftBackup]);

  /**
   * Get formatted recovery message
   */
  const getRecoveryMessage = useCallback((): string => {
    const draft = loadDraftBackup();
    if (!draft) return '';

    const ageMinutes = Math.floor((Date.now() - draft.timestamp) / (1000 * 60));
    const timeAgo = ageMinutes < 60
      ? `${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago`
      : `${Math.floor(ageMinutes / 60)} hour${Math.floor(ageMinutes / 60) !== 1 ? 's' : ''} ago`;

    return `Found unsaved changes from ${timeAgo}. Would you like to recover them?`;
  }, [loadDraftBackup]);

  /**
   * Setup auto-save on window unload
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Browser will show its own confirmation dialog
      // We can't customize the message anymore (browser security)
      e.preventDefault();
      e.returnValue = '';
    };

    // Add event listener when component mounts
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  /**
   * Clean up expired drafts on mount
   */
  useEffect(() => {
    const cleanupExpiredDrafts = () => {
      try {
        const keys = Object.keys(localStorage);
        const recoveryKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

        recoveryKeys.forEach(key => {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);

              if (ageHours > RECOVERY_EXPIRY_HOURS) {
                localStorage.removeItem(key);
                logger.info('Removed expired draft backup', { key, ageHours });
              }
            }
          } catch (_error) {
            // If we can't parse it, remove it
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        logger.error('Error cleaning up expired drafts', { errorDetails: error });
      }
    };

    cleanupExpiredDrafts();
  }, []);

  return {
    saveDraftBackup,
    loadDraftBackup,
    clearDraftBackup,
    hasRecoverableDraft,
    getRecoveryMessage,
    hasShownRecoveryPrompt,
  };
}
