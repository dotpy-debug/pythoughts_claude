/**
 * Email Service
 *
 * Centralized email sending service using Resend API
 * Features:
 * - Template-based emails
 * - Queue integration with BullMQ
 * - Email logging and tracking
 * - Retry logic for failed emails
 *
 * SECURITY WARNING: This file currently exposes RESEND_API_KEY in the frontend.
 * TODO: Move email sending to a backend API endpoint for security.
 * See ENHANCEMENT_PLAN.md for implementation details.
 */

import { Resend } from 'resend';
import type { CreateEmailOptions, CreateEmailResponse } from 'resend';
import { logger } from './logger';

// SECURITY WARNING: API key exposed in frontend environment
// TODO: Move to backend-only environment variable
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';

if (!RESEND_API_KEY) {
  logger.warn('RESEND_API_KEY is not set - email sending will be disabled', {
    environment: import.meta.env.MODE,
  });
}

const resend = new Resend(RESEND_API_KEY);

/**
 * Email sender configuration
 */
export const EMAIL_CONFIG = {
  from: 'Pythoughts <noreply@pythoughts.com>',
  replyTo: 'support@pythoughts.com',
} as const;

/**
 * Email template types
 */
export type EmailTemplate =
  | 'verification'
  | 'password-reset'
  | 'welcome'
  | 'post-reply'
  | 'comment-reply'
  | 'vote-notification'
  | 'mention-notification'
  | 'task-assigned'
  | 'weekly-digest';

/**
 * Email options
 */
export interface EmailOptions {
  /**
   * Recipient email address
   */
  to: string;

  /**
   * Email subject
   */
  subject: string;

  /**
   * HTML content
   */
  html: string;

  /**
   * Plain text content (optional)
   */
  text?: string;

  /**
   * Reply-to address (optional)
   */
  replyTo?: string;

  /**
   * CC recipients (optional)
   */
  cc?: string[];

  /**
   * BCC recipients (optional)
   */
  bcc?: string[];

  /**
   * Email tags for analytics (optional)
   */
  tags?: Array<{ name: string; value: string }>;

  /**
   * Email attachments (optional)
   */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

/**
 * Email result
 */
export interface EmailResult {
  /**
   * Whether the email was sent successfully
   */
  success: boolean;

  /**
   * Email ID from Resend (if successful)
   */
  emailId?: string;

  /**
   * Error message (if failed)
   */
  error?: string;
}

/**
 * Email log entry
 */
export interface EmailLog {
  id: string;
  userId: string;
  template: EmailTemplate;
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'queued' | 'processing';
  emailId?: string;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
}

/**
 * Send email using Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Check if API key is configured
  if (!RESEND_API_KEY) {
    logger.error('Resend API key not configured', {
      to: options.to,
      subject: options.subject,
    });
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const emailOptions: CreateEmailOptions = {
      from: EMAIL_CONFIG.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || EMAIL_CONFIG.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      tags: options.tags,
      attachments: options.attachments,
    };

    const response: CreateEmailResponse = await resend.emails.send(emailOptions);

    if (response.error) {
      logger.error('Resend API error', {
        error: response.error.message,
        to: options.to,
        subject: options.subject,
      });
      return {
        success: false,
        error: response.error.message || 'Failed to send email',
      };
    }

    logger.info('Email sent successfully', {
      emailId: response.data?.id,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: true,
      emailId: response.data?.id,
    };
  } catch (error) {
    logger.error('Error sending email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      to: options.to,
      subject: options.subject,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background-color: #0a0a0a;
            color: #00ff00;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #00ff00;
          }
          .content {
            background-color: #111;
            border: 2px solid #00ff00;
            border-radius: 8px;
            padding: 30px;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #00ff00;
            text-align: center;
            letter-spacing: 8px;
            margin: 30px 0;
            padding: 20px;
            background-color: #0a0a0a;
            border: 1px dashed #00ff00;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
            font-size: 12px;
          }
          a {
            color: #00ff00;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PYTHOUGHTS</div>
          </div>
          <div class="content">
            <h1 style="color: #00ff00; margin-top: 0;">Verify Your Email</h1>
            <p>Welcome to Pythoughts! Please use the following code to verify your email address:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #999; font-size: 14px;">If you didn't create an account with Pythoughts, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Pythoughts. All rights reserved.</p>
            <p><a href="https://pythoughts.com">Visit our website</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
PYTHOUGHTS

Verify Your Email

Welcome to Pythoughts! Please use the following code to verify your email address:

${code}

This code will expire in 10 minutes.

If you didn't create an account with Pythoughts, you can safely ignore this email.

© ${new Date().getFullYear()} Pythoughts. All rights reserved.
Visit us at: https://pythoughts.com
  `;

  return sendEmail({
    to,
    subject: 'Verify Your Email - Pythoughts',
    html,
    text,
    tags: [
      { name: 'category', value: 'verification' },
      { name: 'template', value: 'verification' },
    ],
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background-color: #0a0a0a;
            color: #00ff00;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #00ff00;
          }
          .content {
            background-color: #111;
            border: 2px solid #00ff00;
            border-radius: 8px;
            padding: 30px;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background-color: #00ff00;
            color: #0a0a0a;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
            font-size: 12px;
          }
          a {
            color: #00ff00;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PYTHOUGHTS</div>
          </div>
          <div class="content">
            <h1 style="color: #00ff00; margin-top: 0;">Reset Your Password</h1>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p style="color: #999; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">Or copy and paste this URL into your browser: ${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Pythoughts. All rights reserved.</p>
            <p><a href="https://pythoughts.com">Visit our website</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
PYTHOUGHTS

Reset Your Password

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} Pythoughts. All rights reserved.
Visit us at: https://pythoughts.com
  `;

  return sendEmail({
    to,
    subject: 'Reset Your Password - Pythoughts',
    html,
    text,
    tags: [
      { name: 'category', value: 'password-reset' },
      { name: 'template', value: 'password-reset' },
    ],
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  to: string,
  username: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Pythoughts</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background-color: #0a0a0a;
            color: #00ff00;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #00ff00;
          }
          .content {
            background-color: #111;
            border: 2px solid #00ff00;
            border-radius: 8px;
            padding: 30px;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background-color: #00ff00;
            color: #0a0a0a;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
            font-size: 12px;
          }
          a {
            color: #00ff00;
          }
          ul {
            color: #00ff00;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PYTHOUGHTS</div>
          </div>
          <div class="content">
            <h1 style="color: #00ff00; margin-top: 0;">Welcome to Pythoughts, ${username}!</h1>
            <p>We're excited to have you join our community of Python developers and thinkers.</p>
            <p>Here's what you can do on Pythoughts:</p>
            <ul>
              <li>Share your Python thoughts and experiences</li>
              <li>Engage with the community through comments and reactions</li>
              <li>Discover new Python techniques and best practices</li>
              <li>Build your coding portfolio with a beautiful terminal-themed profile</li>
            </ul>
            <div style="text-align: center;">
              <a href="https://pythoughts.com" class="button">Get Started</a>
            </div>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">Have questions? Check out our <a href="https://pythoughts.com/help">help center</a> or reply to this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Pythoughts. All rights reserved.</p>
            <p><a href="https://pythoughts.com">Visit our website</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
PYTHOUGHTS

Welcome to Pythoughts, ${username}!

We're excited to have you join our community of Python developers and thinkers.

Here's what you can do on Pythoughts:

- Share your Python thoughts and experiences
- Engage with the community through comments and reactions
- Discover new Python techniques and best practices
- Build your coding portfolio with a beautiful terminal-themed profile

Get started: https://pythoughts.com

Have questions? Check out our help center: https://pythoughts.com/help

© ${new Date().getFullYear()} Pythoughts. All rights reserved.
Visit us at: https://pythoughts.com
  `;

  return sendEmail({
    to,
    subject: 'Welcome to Pythoughts! 🐍',
    html,
    text,
    tags: [
      { name: 'category', value: 'welcome' },
      { name: 'template', value: 'welcome' },
    ],
  });
}

/**
 * Send post reply notification email
 */
export async function sendPostReplyEmail(
  to: string,
  params: {
    recipientName: string;
    replierName: string;
    postTitle: string;
    replyContent: string;
    postUrl: string;
  }
): Promise<EmailResult> {
  const { render } = await import('@react-email/components');
  const { PostReplyEmail } = await import('../emails/PostReplyEmail');

  const html = await render(PostReplyEmail({
    ...params,
    unsubscribeUrl: 'https://pythoughts.com/settings/preferences',
  }));

  return sendEmail({
    to,
    subject: `${params.replierName} replied to your post: ${params.postTitle}`,
    html,
    tags: [
      { name: 'category', value: 'notification' },
      { name: 'template', value: 'post-reply' },
    ],
  });
}

/**
 * Send comment reply notification email
 */
export async function sendCommentReplyEmail(
  to: string,
  params: {
    recipientName: string;
    replierName: string;
    postTitle: string;
    originalComment: string;
    replyContent: string;
    postUrl: string;
  }
): Promise<EmailResult> {
  const { render } = await import('@react-email/components');
  const { CommentReplyEmail } = await import('../emails/CommentReplyEmail');

  const html = await render(CommentReplyEmail({
    ...params,
    unsubscribeUrl: 'https://pythoughts.com/settings/preferences',
  }));

  return sendEmail({
    to,
    subject: `${params.replierName} replied to your comment on ${params.postTitle}`,
    html,
    tags: [
      { name: 'category', value: 'notification' },
      { name: 'template', value: 'comment-reply' },
    ],
  });
}

/**
 * Send vote milestone notification email
 */
export async function sendVoteNotificationEmail(
  to: string,
  params: {
    recipientName: string;
    postTitle: string;
    voteCount: number;
    milestone: number;
    postUrl: string;
  }
): Promise<EmailResult> {
  const { render } = await import('@react-email/components');
  const { VoteNotificationEmail } = await import('../emails/VoteNotificationEmail');

  const html = await render(VoteNotificationEmail({
    ...params,
    unsubscribeUrl: 'https://pythoughts.com/settings/preferences',
  }));

  return sendEmail({
    to,
    subject: `Your post "${params.postTitle}" reached ${params.milestone} votes!`,
    html,
    tags: [
      { name: 'category', value: 'notification' },
      { name: 'template', value: 'vote-notification' },
    ],
  });
}

/**
 * Send mention notification email
 */
export async function sendMentionNotificationEmail(
  to: string,
  params: {
    recipientName: string;
    mentionerName: string;
    contentType: 'post' | 'comment';
    contentTitle?: string;
    contentExcerpt: string;
    contentUrl: string;
  }
): Promise<EmailResult> {
  const { render } = await import('@react-email/components');
  const { MentionNotificationEmail } = await import('../emails/MentionNotificationEmail');

  const html = await render(MentionNotificationEmail({
    ...params,
    unsubscribeUrl: 'https://pythoughts.com/settings/preferences',
  }));

  const subject = params.contentType === 'post'
    ? `${params.mentionerName} mentioned you in a post`
    : `${params.mentionerName} mentioned you in a comment`;

  return sendEmail({
    to,
    subject,
    html,
    tags: [
      { name: 'category', value: 'notification' },
      { name: 'template', value: 'mention-notification' },
    ],
  });
}

/**
 * Send task assigned notification email
 */
export async function sendTaskAssignedEmail(
  to: string,
  params: {
    recipientName: string;
    assignerName: string;
    taskTitle: string;
    taskDescription: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    taskUrl: string;
  }
): Promise<EmailResult> {
  const { render } = await import('@react-email/components');
  const { TaskAssignedEmail } = await import('../emails/TaskAssignedEmail');

  const html = await render(TaskAssignedEmail({
    ...params,
    unsubscribeUrl: 'https://pythoughts.com/settings/preferences',
  }));

  return sendEmail({
    to,
    subject: `New task assigned: ${params.taskTitle}`,
    html,
    tags: [
      { name: 'category', value: 'notification' },
      { name: 'template', value: 'task-assigned' },
    ],
  });
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigestEmail(
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
  }
): Promise<EmailResult> {
  const { render } = await import('@react-email/components');
  const { WeeklyDigestEmail } = await import('../emails/WeeklyDigestEmail');

  const html = await render(WeeklyDigestEmail({
    ...params,
    unsubscribeUrl: 'https://pythoughts.com/settings/preferences',
  }));

  return sendEmail({
    to,
    subject: `Your weekly Pythoughts digest for ${params.weekStart} - ${params.weekEnd}`,
    html,
    tags: [
      { name: 'category', value: 'digest' },
      { name: 'template', value: 'weekly-digest' },
    ],
  });
}
