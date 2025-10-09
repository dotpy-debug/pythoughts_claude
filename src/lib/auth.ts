/**
 * Better-Auth Server Configuration
 *
 * This module configures Better-Auth with:
 * - PostgreSQL database integration via Supabase
 * - Resend email provider for OTP verification
 * - Email/password authentication
 * - Session management with 7-day expiry
 * - Two-factor authentication support
 *
 * @module auth
 * @see https://better-auth.com for documentation
 */

import { betterAuth } from 'better-auth';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { env } from './env';
import { logger } from './logger';

/**
 * Database adapter configuration for Better-Auth
 * Uses Supabase PostgreSQL with existing better_auth_* tables
 */
const getDatabaseConfig = () => {
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  return {
    provider: 'postgres' as const,
    url: env.VITE_SUPABASE_URL,
    client: supabase,
    schema: {
      // Map Better-Auth tables to our existing schema
      user: 'profiles',
      session: 'better_auth_sessions',
      account: 'better_auth_accounts',
    },
  };
};

/**
 * Resend email provider configuration
 * Handles OTP verification, password reset, and welcome emails
 */
const getResendConfig = () => {
  if (!env.VITE_RESEND_API_KEY) {
    logger.warn('Resend API key not configured - email features disabled');
    return undefined;
  }

  const resend = new Resend(env.VITE_RESEND_API_KEY);

  return {
    /**
     * Send OTP verification email
     */
    sendVerificationEmail: async ({ email, token }: { email: string; token: string }) => {
      try {
        const { data, error } = await resend.emails.send({
          from: 'Pythoughts <noreply@pythoughts.com>',
          to: email,
          subject: 'Verify your email - Pythoughts',
          html: `
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
                    margin: 40px auto;
                    background-color: #1a1a1a;
                    border: 2px solid #00ff00;
                    border-radius: 8px;
                    padding: 40px;
                  }
                  .header {
                    text-align: center;
                    margin-bottom: 30px;
                  }
                  .header h1 {
                    color: #00ff00;
                    font-size: 32px;
                    margin: 0;
                  }
                  .content {
                    line-height: 1.6;
                    font-size: 16px;
                  }
                  .otp-code {
                    background-color: #0a0a0a;
                    border: 1px solid #00ff00;
                    border-radius: 4px;
                    padding: 20px;
                    text-align: center;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    margin: 30px 0;
                    color: #00ff00;
                  }
                  .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #00ff00;
                    font-size: 14px;
                    color: #888;
                    text-align: center;
                  }
                  .warning {
                    color: #ff9500;
                    margin-top: 20px;
                    font-size: 14px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>&gt; Pythoughts_</h1>
                  </div>
                  <div class="content">
                    <p>Hello,</p>
                    <p>Thank you for signing up for Pythoughts! To verify your email address, please use the following one-time password (OTP):</p>
                    <div class="otp-code">${token}</div>
                    <p>This code will expire in 10 minutes for security purposes.</p>
                    <p class="warning">If you did not request this verification code, please ignore this email.</p>
                  </div>
                  <div class="footer">
                    <p>Pythoughts - Where Python Thoughts Connect</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        if (error) {
          logger.error('Failed to send verification email', error as Error, { email });
          throw error;
        }

        logger.info('Verification email sent', { email, messageId: data?.id });
        return { success: true };
      } catch (error) {
        logger.error('Error sending verification email', error as Error, { email });
        throw error;
      }
    },

    /**
     * Send password reset email
     */
    sendPasswordResetEmail: async ({ email, token }: { email: string; token: string }) => {
      try {
        const resetUrl = `${env.VITE_BETTER_AUTH_URL}/reset-password?token=${token}`;

        const { data, error } = await resend.emails.send({
          from: 'Pythoughts <noreply@pythoughts.com>',
          to: email,
          subject: 'Reset your password - Pythoughts',
          html: `
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
                    margin: 40px auto;
                    background-color: #1a1a1a;
                    border: 2px solid #00ff00;
                    border-radius: 8px;
                    padding: 40px;
                  }
                  .header {
                    text-align: center;
                    margin-bottom: 30px;
                  }
                  .header h1 {
                    color: #00ff00;
                    font-size: 32px;
                    margin: 0;
                  }
                  .content {
                    line-height: 1.6;
                    font-size: 16px;
                  }
                  .button {
                    display: inline-block;
                    background-color: #00ff00;
                    color: #0a0a0a;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin: 20px 0;
                  }
                  .button:hover {
                    background-color: #00dd00;
                  }
                  .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #00ff00;
                    font-size: 14px;
                    color: #888;
                    text-align: center;
                  }
                  .warning {
                    color: #ff9500;
                    margin-top: 20px;
                    font-size: 14px;
                  }
                  .link-fallback {
                    word-break: break-all;
                    color: #00ff00;
                    font-size: 12px;
                    margin-top: 10px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>&gt; Pythoughts_</h1>
                  </div>
                  <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <div style="text-align: center;">
                      <a href="${resetUrl}" class="button">Reset Password</a>
                    </div>
                    <p class="link-fallback">Or copy and paste this link into your browser:<br>${resetUrl}</p>
                    <p>This link will expire in 1 hour for security purposes.</p>
                    <p class="warning">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                  </div>
                  <div class="footer">
                    <p>Pythoughts - Where Python Thoughts Connect</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        if (error) {
          logger.error('Failed to send password reset email', error as Error, { email });
          throw error;
        }

        logger.info('Password reset email sent', { email, messageId: data?.id });
        return { success: true };
      } catch (error) {
        logger.error('Error sending password reset email', error as Error, { email });
        throw error;
      }
    },

    /**
     * Send welcome email after successful registration
     */
    sendWelcomeEmail: async ({ email, username }: { email: string; username: string }) => {
      try {
        const { data, error } = await resend.emails.send({
          from: 'Pythoughts <noreply@pythoughts.com>',
          to: email,
          subject: 'Welcome to Pythoughts!',
          html: `
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
                    margin: 40px auto;
                    background-color: #1a1a1a;
                    border: 2px solid #00ff00;
                    border-radius: 8px;
                    padding: 40px;
                  }
                  .header {
                    text-align: center;
                    margin-bottom: 30px;
                  }
                  .header h1 {
                    color: #00ff00;
                    font-size: 32px;
                    margin: 0;
                  }
                  .content {
                    line-height: 1.6;
                    font-size: 16px;
                  }
                  .features {
                    background-color: #0a0a0a;
                    border: 1px solid #00ff00;
                    border-radius: 4px;
                    padding: 20px;
                    margin: 20px 0;
                  }
                  .feature-item {
                    margin: 10px 0;
                    padding-left: 20px;
                  }
                  .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #00ff00;
                    font-size: 14px;
                    color: #888;
                    text-align: center;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>&gt; Pythoughts_</h1>
                  </div>
                  <div class="content">
                    <p>Hello ${username},</p>
                    <p>Welcome to Pythoughts! We're excited to have you join our community of Python developers and enthusiasts.</p>
                    <div class="features">
                      <h3>Get Started:</h3>
                      <div class="feature-item">&gt; Share your Python thoughts and code snippets</div>
                      <div class="feature-item">&gt; Connect with other developers</div>
                      <div class="feature-item">&gt; Discover trending Python content</div>
                      <div class="feature-item">&gt; Build your developer profile</div>
                    </div>
                    <p>Start exploring and sharing your Python journey today!</p>
                  </div>
                  <div class="footer">
                    <p>Pythoughts - Where Python Thoughts Connect</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        if (error) {
          logger.error('Failed to send welcome email', error as Error, { email });
          // Don't throw here - welcome email is non-critical
          return { success: false };
        }

        logger.info('Welcome email sent', { email, messageId: data?.id });
        return { success: true };
      } catch (error) {
        logger.error('Error sending welcome email', error as Error, { email });
        // Don't throw here - welcome email is non-critical
        return { success: false };
      }
    },
  };
};

/**
 * Better-Auth instance with complete configuration
 *
 * Features:
 * - Email/password authentication
 * - Email verification via OTP
 * - Password reset flow
 * - Session management (7-day expiry)
 * - Two-factor authentication support
 * - PostgreSQL database via Supabase
 */
export const auth = betterAuth({
  // Base configuration
  secret: env.VITE_BETTER_AUTH_SECRET || 'development-secret-change-in-production',
  baseURL: env.VITE_BETTER_AUTH_URL || 'http://localhost:5173',

  // Database configuration
  database: getDatabaseConfig(),

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  // Email provider configuration
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async (data) => {
      const config = getResendConfig();
      if (config) {
        await config.sendPasswordResetEmail({ email: data.user.email, token: data.token });
      }
      // Better-Auth expects void return type, not { success: boolean }
    },
    sendVerificationEmail: async (data: { user: { email: string }; url: string; token: string }) => {
      const config = getResendConfig();
      if (config) {
        await config.sendVerificationEmail({ email: data.user.email, token: data.token });
      }
      // Better-Auth expects void return type, not { success: boolean }
    },
  },

  // Two-factor authentication configuration
  twoFactor: {
    enabled: true,
    issuer: 'Pythoughts',
  },

  // User schema mapping to existing profiles table
  user: {
    additionalFields: {
      bio: {
        type: 'string' as const,
      },
      username: {
        type: 'string' as const,
      },
      avatar_url: {
        type: 'string' as const,
      },
    },
  },

  // Advanced options
  advanced: {
    // Generate secure tokens for email verification
    generateId: () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    },
  },
});

/**
 * Export type-safe auth types for client usage
 */
export type Auth = typeof auth;

// Better-Auth getSession returns Data<T> | Error union type
// We need to extract the actual session data from the Data wrapper
type SessionResponse = Awaited<ReturnType<typeof auth.api.getSession>>;
export type Session = SessionResponse extends { data: infer D }
  ? D extends { user: unknown; session: unknown }
    ? D
    : never
  : SessionResponse extends { user: unknown; session: unknown }
    ? SessionResponse
    : never;

export type User = Session extends { user: infer U } ? U : never;

/**
 * Helper function to send welcome email after registration
 * Call this after successful user creation
 */
export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  const resendConfig = getResendConfig();
  if (resendConfig) {
    await resendConfig.sendWelcomeEmail({ email, username });
  } else {
    logger.warn('Skipping welcome email - Resend not configured');
  }
}

/**
 * Helper function to validate session server-side
 */
export async function validateSession(sessionToken: string) {
  try {
    const session = await auth.api.getSession({ headers: { cookie: `session=${sessionToken}` } });
    return session;
  } catch (error) {
    logger.error('Session validation failed', error as Error);
    return null;
  }
}

/**
 * Helper function to get current user from request
 */
export async function getCurrentUser(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user || null;
  } catch (error) {
    logger.error('Failed to get current user', error as Error);
    return null;
  }
}

// Log initialization status
logger.info('Better-Auth initialized', {
  baseURL: env.VITE_BETTER_AUTH_URL || 'http://localhost:5173',
  emailEnabled: !!env.VITE_RESEND_API_KEY,
  twoFactorEnabled: true,
  sessionExpiry: '7 days',
});
