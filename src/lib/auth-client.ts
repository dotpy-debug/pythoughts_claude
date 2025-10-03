/**
 * Better-Auth Client Utilities
 *
 * This module provides client-side authentication utilities including:
 * - React hooks for authentication state
 * - Helper functions for sign in/up/out
 * - Session management
 * - Type-safe auth client instance
 *
 * @module auth-client
 * @see https://better-auth.com/docs/client for documentation
 */

import { createAuthClient } from 'better-auth/client';
import { useState, useEffect, useCallback } from 'react';
import { env } from './env';
import type { User, Session } from './auth';

/**
 * Better-Auth client instance
 * Use this for all client-side authentication operations
 */
export const authClient = createAuthClient({
  baseURL: env.VITE_BETTER_AUTH_URL || 'http://localhost:5173',
  fetchOptions: {
    credentials: 'include', // Include cookies in requests
  },
});

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

/**
 * Sign up parameters
 */
export interface SignUpParams {
  email: string;
  password: string;
  username: string;
}

/**
 * Sign in parameters
 */
export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Password reset parameters
 */
export interface ResetPasswordParams {
  email: string;
}

/**
 * Verify email parameters
 */
export interface VerifyEmailParams {
  email: string;
  code: string;
}

/**
 * Update profile parameters
 */
export interface UpdateProfileParams {
  username?: string;
  bio?: string;
  avatar_url?: string;
}

/**
 * React hook for authentication state
 *
 * @example
 * ```tsx
 * function Profile() {
 *   const { user, isAuthenticated, isLoading } = useAuth();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!isAuthenticated) return <div>Not logged in</div>;
 *
 *   return <div>Hello {user.name}!</div>;
 * }
 * ```
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const response = await authClient.getSession();

        if (mounted) {
          // Better-Auth returns a Data<T> | Error union type
          // We need to check for error and extract data properly
          if ('error' in response && response.error) {
            setState({
              user: null,
              session: null,
              isLoading: false,
              isAuthenticated: false,
              error: new Error(response.error.message || 'Failed to load session'),
            });
          } else {
            // Response has data property with session info
            const sessionData = 'data' in response ? response.data : null;
            setState({
              user: (sessionData?.user || null) as User | null,
              session: sessionData as Session | null,
              isLoading: false,
              isAuthenticated: !!sessionData?.user,
              error: null,
            });
          }
        }
      } catch (error) {
        if (mounted) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            error: error instanceof Error ? error : new Error('Failed to load session'),
          });
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * React hook for authentication actions
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { signIn, isLoading, error } = useAuthActions();
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     await signIn({ email, password });
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useAuthActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signUp = useCallback(async ({ email, password, username }: SignUpParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: username,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Sign up failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign up failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Sign in failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign in failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authClient.signOut();
      // Force page reload to clear all state
      window.location.href = '/';
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async ({ code }: VerifyEmailParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // Better-Auth verifyEmail expects query parameter with token, not email + code
      // The token parameter is the verification code/OTP
      const result = await authClient.verifyEmail({
        query: {
          token: code,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Email verification failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Email verification failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async ({ email }: ResetPasswordParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.forgetPassword({
        email,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Password reset request failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Password reset request failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (params: UpdateProfileParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // Better-Auth updateUser expects name and image fields
      // We need to map our custom fields to the supported fields
      const updateData: { name?: string; image?: string } = {};

      if (params.username) {
        updateData.name = params.username;
      }

      if (params.avatar_url) {
        updateData.image = params.avatar_url;
      }

      const result = await authClient.updateUser(updateData);

      if (result.error) {
        throw new Error(result.error.message || 'Profile update failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Profile update failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signUp,
    signIn,
    signOut,
    verifyEmail,
    resetPassword,
    updateProfile,
    isLoading,
    error,
  };
}

/**
 * Helper function to sign up a new user
 * Non-hook version for use outside React components
 */
export async function signUp({ email, password, username }: SignUpParams) {
  const result = await authClient.signUp.email({
    email,
    password,
    name: username,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Sign up failed');
  }

  return result;
}

/**
 * Helper function to sign in a user
 * Non-hook version for use outside React components
 */
export async function signIn({ email, password }: SignInParams) {
  const result = await authClient.signIn.email({
    email,
    password,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Sign in failed');
  }

  return result;
}

/**
 * Helper function to sign out the current user
 * Non-hook version for use outside React components
 */
export async function signOut() {
  await authClient.signOut();
  window.location.href = '/';
}

/**
 * Helper function to verify email with OTP
 * Non-hook version for use outside React components
 */
export async function verifyEmail({ code }: VerifyEmailParams) {
  // Better-Auth verifyEmail expects query parameter with token, not email + code
  const result = await authClient.verifyEmail({
    query: {
      token: code,
    },
  });

  if (result.error) {
    throw new Error(result.error.message || 'Email verification failed');
  }

  return result;
}

/**
 * Helper function to request password reset
 * Non-hook version for use outside React components
 */
export async function resetPassword({ email }: ResetPasswordParams) {
  const result = await authClient.forgetPassword({
    email,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Password reset request failed');
  }

  return result;
}

/**
 * Helper function to get current session
 * Non-hook version for use outside React components
 */
export async function getSession() {
  try {
    return await authClient.getSession();
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Helper function to check if user is authenticated
 * Non-hook version for use outside React components
 */
export async function isAuthenticated(): Promise<boolean> {
  const response = await getSession();
  // Handle Better-Auth response type
  if (!response) return false;
  if ('error' in response && response.error) return false;
  const sessionData = 'data' in response ? response.data : response;
  return !!sessionData?.user;
}

/**
 * Helper function to get current user
 * Non-hook version for use outside React components
 */
export async function getCurrentUser(): Promise<User | null> {
  const response = await getSession();
  // Handle Better-Auth response type
  if (!response) return null;
  if ('error' in response && response.error) return null;
  const sessionData = 'data' in response ? response.data : response;
  return (sessionData?.user || null) as User | null;
}

/**
 * Session storage key for client-side session management
 */
export const SESSION_STORAGE_KEY = 'better-auth-session';

/**
 * Helper function to manually refresh session
 */
export async function refreshSession() {
  try {
    const session = await authClient.getSession();
    if (session) {
      // Store session in sessionStorage for quick access
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return session;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

/**
 * Helper function to get cached session from sessionStorage
 * Use this for immediate session access without API call
 */
export function getCachedSession(): Session | null {
  try {
    const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to get cached session:', error);
    return null;
  }
}

/**
 * React hook for session refresh
 * Automatically refreshes session on mount and when tab becomes visible
 */
export function useSessionRefresh() {
  useEffect(() => {
    // Initial refresh
    refreshSession();

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

/**
 * Protected route helper
 * Returns true if user is authenticated, false otherwise
 * Redirects to login page if not authenticated
 */
export async function requireAuth(redirectTo: string = '/login'): Promise<boolean> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    window.location.href = redirectTo;
    return false;
  }

  return true;
}

/**
 * Export auth client for advanced usage
 */
export { authClient as default };
