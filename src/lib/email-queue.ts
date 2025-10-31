/**
 * Email Queue System
 *
 * BullMQ-based email queue for async email processing
 * Features:
 * - Delayed email sending
 * - Retry logic for failed emails
 * - Email batching and throttling
 * - Job prioritization
 */

import { Queue, Worker, Job } from 'bullmq';
import type { EmailOptions, EmailResult, EmailTemplate } from './email-service';
import {
  sendEmail,
  sendPostReplyEmail,
  sendCommentReplyEmail,
  sendVoteNotificationEmail,
  sendMentionNotificationEmail,
  sendTaskAssignedEmail,
  sendWeeklyDigestEmail,
} from './email-service';
import { logger } from './logger';

/**
 * Redis connection configuration
 * Note: You'll need to configure Redis connection for production
 */
const REDIS_CONFIG = {
  host: import.meta.env.VITE_REDIS_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_REDIS_PORT || '6379'),
  password: import.meta.env.VITE_REDIS_PASSWORD,
};

/**
 * Email job data types
 */
export type EmailJobData =
  | {
      type: 'raw';
      options: EmailOptions;
    }
  | {
      type: 'post-reply';
      to: string;
      params: {
        recipientName: string;
        replierName: string;
        postTitle: string;
        replyContent: string;
        postUrl: string;
      };
    }
  | {
      type: 'comment-reply';
      to: string;
      params: {
        recipientName: string;
        replierName: string;
        postTitle: string;
        originalComment: string;
        replyContent: string;
        postUrl: string;
      };
    }
  | {
      type: 'vote-notification';
      to: string;
      params: {
        recipientName: string;
        postTitle: string;
        voteCount: number;
        milestone: number;
        postUrl: string;
      };
    }
  | {
      type: 'mention-notification';
      to: string;
      params: {
        recipientName: string;
        mentionerName: string;
        contentType: 'post' | 'comment';
        contentTitle?: string;
        contentExcerpt: string;
        contentUrl: string;
      };
    }
  | {
      type: 'task-assigned';
      to: string;
      params: {
        recipientName: string;
        assignerName: string;
        taskTitle: string;
        taskDescription: string;
        dueDate?: string;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        taskUrl: string;
      };
    }
  | {
      type: 'weekly-digest';
      to: string;
      params: {
        recipientName: string;
        weekStart: string;
        weekEnd: string;
        userStats: {
          postsCreated: number;
          commentsReceived: number;
          votesReceived: number;
          newFollowers: number;
        };
        trendingPosts: Array<{
          title: string;
          excerpt: string;
          author: string;
          votes: number;
          comments: number;
          url: string;
        }>;
      };
    };

/**
 * Email queue options
 */
export interface EmailQueueOptions {
  /**
   * Priority (1-10, higher is more important)
   */
  priority?: number;

  /**
   * Delay in milliseconds before processing
   */
  delay?: number;

  /**
   * Number of retry attempts
   */
  attempts?: number;

  /**
   * Backoff strategy for retries
   */
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };

  /**
   * Job metadata
   */
  metadata?: {
    userId?: string;
    template?: EmailTemplate;
    [key: string]: unknown;
  };
}

/**
 * Email queue instance
 */
let emailQueue: Queue<EmailJobData> | null = null;

/**
 * Email worker instance
 */
let emailWorker: Worker<EmailJobData, EmailResult> | null = null;

/**
 * Get or create email queue
 */
export function getEmailQueue(): Queue<EmailJobData> {
  if (emailQueue) {
    return emailQueue;
  }

  emailQueue = new Queue<EmailJobData>('email-queue', {
    connection: REDIS_CONFIG,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  return emailQueue;
}

/**
 * Process email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<EmailResult> {
  logger.info('Processing email job', {
    jobId: job.id,
    emailType: job.data.type,
    attemptNumber: job.attemptsMade + 1,
  });

  try {
    let result: EmailResult;

    switch (job.data.type) {
      case 'raw':
        result = await sendEmail(job.data.options);
        break;

      case 'post-reply':
        result = await sendPostReplyEmail(job.data.to, job.data.params);
        break;

      case 'comment-reply':
        result = await sendCommentReplyEmail(job.data.to, job.data.params);
        break;

      case 'vote-notification':
        result = await sendVoteNotificationEmail(job.data.to, job.data.params);
        break;

      case 'mention-notification':
        result = await sendMentionNotificationEmail(job.data.to, job.data.params);
        break;

      case 'task-assigned':
        result = await sendTaskAssignedEmail(job.data.to, job.data.params);
        break;

      case 'weekly-digest':
        result = await sendWeeklyDigestEmail(job.data.to, job.data.params);
        break;

      default:
        throw new Error(`Unknown email type: ${(job.data as Record<string, unknown>).type}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    logger.info('Email job completed successfully', {
      jobId: job.id,
      emailId: result.emailId,
      emailType: job.data.type,
    });
    return result;
  } catch (error) {
    logger.error('Email job failed', {
      jobId: job.id,
      emailType: job.data.type,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      attemptNumber: job.attemptsMade + 1,
    });
    throw error;
  }
}

/**
 * Start email worker
 */
export function startEmailWorker(): Worker<EmailJobData, EmailResult> {
  if (emailWorker) {
    return emailWorker;
  }

  emailWorker = new Worker<EmailJobData, EmailResult>('email-queue', processEmailJob, {
    connection: REDIS_CONFIG,
    concurrency: 5, // Process up to 5 emails concurrently
    limiter: {
      max: 10, // Max 10 emails
      duration: 1000, // Per second (Resend rate limit)
    },
  });

  // Event handlers
  emailWorker.on('completed', (job) => {
    logger.info('Email worker job completed', {
      jobId: job.id,
      jobName: job.name,
    });
  });

  emailWorker.on('failed', (job, error) => {
    logger.error('Email worker job failed', {
      jobId: job?.id,
      jobName: job?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  });

  emailWorker.on('error', (error) => {
    logger.error('Email worker error', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  });

  logger.info('Email worker started', {
    concurrency: 5,
    rateLimit: '10 emails per second',
  });
  return emailWorker;
}

/**
 * Stop email worker
 */
export async function stopEmailWorker(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    logger.info('Email worker stopped');
  }
}

/**
 * Add email job to queue
 */
export async function queueEmail(
  data: EmailJobData,
  options: EmailQueueOptions = {}
): Promise<Job<EmailJobData>> {
  const queue = getEmailQueue();

  const job = await queue.add(`email-${data.type}`, data, {
    priority: options.priority,
    delay: options.delay,
    attempts: options.attempts,
    backoff: options.backoff,
  });

  logger.info('Queued email job', {
    jobId: job.id,
    emailType: data.type,
    priority: options.priority,
    delay: options.delay,
  });
  return job;
}

/**
 * Queue post reply notification
 */
export async function queuePostReplyEmail(
  to: string,
  params: {
    recipientName: string;
    replierName: string;
    postTitle: string;
    replyContent: string;
    postUrl: string;
  },
  options: EmailQueueOptions = {}
): Promise<Job<EmailJobData>> {
  return queueEmail(
    {
      type: 'post-reply',
      to,
      params,
    },
    {
      priority: 5,
      ...options,
    }
  );
}

/**
 * Queue comment reply notification
 */
export async function queueCommentReplyEmail(
  to: string,
  params: {
    recipientName: string;
    replierName: string;
    postTitle: string;
    originalComment: string;
    replyContent: string;
    postUrl: string;
  },
  options: EmailQueueOptions = {}
): Promise<Job<EmailJobData>> {
  return queueEmail(
    {
      type: 'comment-reply',
      to,
      params,
    },
    {
      priority: 5,
      ...options,
    }
  );
}

/**
 * Queue vote notification
 */
export async function queueVoteNotificationEmail(
  to: string,
  params: {
    recipientName: string;
    postTitle: string;
    voteCount: number;
    milestone: number;
    postUrl: string;
  },
  options: EmailQueueOptions = {}
): Promise<Job<EmailJobData>> {
  return queueEmail(
    {
      type: 'vote-notification',
      to,
      params,
    },
    {
      priority: 3,
      ...options,
    }
  );
}

/**
 * Queue mention notification
 */
export async function queueMentionNotificationEmail(
  to: string,
  params: {
    recipientName: string;
    mentionerName: string;
    contentType: 'post' | 'comment';
    contentTitle?: string;
    contentExcerpt: string;
    contentUrl: string;
  },
  options: EmailQueueOptions = {}
): Promise<Job<EmailJobData>> {
  return queueEmail(
    {
      type: 'mention-notification',
      to,
      params,
    },
    {
      priority: 6,
      ...options,
    }
  );
}

/**
 * Queue task assigned notification
 */
export async function queueTaskAssignedEmail(
  to: string,
  params: {
    recipientName: string;
    assignerName: string;
    taskTitle: string;
    taskDescription: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    taskUrl: string;
  },
  options: EmailQueueOptions = {}
): Promise<Job<EmailJobData>> {
  const emailPriority = params.priority === 'urgent' ? 10 : params.priority === 'high' ? 7 : 5;

  return queueEmail(
    {
      type: 'task-assigned',
      to,
      params,
    },
    {
      priority: emailPriority,
      ...options,
    }
  );
}

/**
 * Queue weekly digest
 */
export async function queueWeeklyDigestEmail(
  to: string,
  params: {
    recipientName: string;
    weekStart: string;
    weekEnd: string;
    userStats: {
      postsCreated: number;
      commentsReceived: number;
      votesReceived: number;
      newFollowers: number;
    };
    trendingPosts: Array<{
      title: string;
      excerpt: string;
      author: string;
      votes: number;
      comments: number;
      url: string;
    }>;
  },
  options: EmailQueueOptions = {}
): Promise<Job<EmailJobData>> {
  return queueEmail(
    {
      type: 'weekly-digest',
      to,
      params,
    },
    {
      priority: 1, // Low priority for digest emails
      ...options,
    }
  );
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const queue = getEmailQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clear all jobs from queue
 */
export async function clearQueue(): Promise<void> {
  const queue = getEmailQueue();
  await queue.drain();
  await queue.clean(0, 0); // Remove all jobs
  logger.info('Email queue cleared');
}
