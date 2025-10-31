/**
 * Auto-flagging utility for Pythoughts Platform
 *
 * Automatically creates system-generated reports when suspicious
 * content is detected by the automated content filtering system.
 */

import { supabase } from '../lib/supabase';
import { checkContentSafety, shouldAutoFlag } from './contentFilter';
import { logger } from '../lib/logger';

/**
 * Auto-flag content for moderation review
 * Creates a system-generated report if content is flagged
 */
export async function autoFlagContent(
  contentId: string,
  contentType: 'post' | 'comment',
  content: string,
  authorId: string
): Promise<{ flagged: boolean; reasons: string[] }> {
  const safetyCheck = checkContentSafety(content);

  // Only auto-flag if severity is high or critical
  if (!shouldAutoFlag(content)) {
    return { flagged: false, reasons: [] };
  }

  try {
    // Create a system-generated report
    const reportData: Record<string, unknown> = {
      reporter_id: authorId, // System reports use the author as reporter for tracking
      reported_user_id: authorId,
      reason: `Automated flagging: ${safetyCheck.severity} severity content detected`,
      category: 'other',
      description: `This content was automatically flagged by the system. Issues detected: ${safetyCheck.issues.join(', ')}`,
      status: 'pending',
    };

    if (contentType === 'post') {
      reportData.post_id = contentId;
    } else {
      reportData.comment_id = contentId;
    }

    const { error } = await supabase.from('reports').insert(reportData);

    if (error) {
      logger.error('Failed to create auto-flag report', new Error(error.message || 'Unknown error'), {
        code: error.code,
        contentType,
        contentId,
        severity: safetyCheck.severity,
      });
      return { flagged: false, reasons: safetyCheck.issues };
    }

    logger.warn('Content auto-flagged for moderation review', {
      contentType,
      contentId,
      severity: safetyCheck.severity,
      issues: safetyCheck.issues,
      authorId,
    });

    return { flagged: true, reasons: safetyCheck.issues };
  } catch (error) {
    logger.error('Error in auto-flagging system', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      contentType,
      contentId,
    });
    return { flagged: false, reasons: safetyCheck.issues };
  }
}

/**
 * Check if content should be auto-flagged and return warning message
 */
export function getAutoFlagWarning(content: string): string | null {
  const safetyCheck = checkContentSafety(content);

  if (shouldAutoFlag(content)) {
    return `This content has been automatically flagged for moderator review due to: ${safetyCheck.issues.join(', ')}`;
  }

  return null;
}

export default {
  autoFlagContent,
  getAutoFlagWarning,
};
