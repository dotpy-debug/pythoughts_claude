/**
 * AdminRoute Component
 *
 * A component wrapper that protects admin-only routes.
 * Redirects non-admin users to the home page.
 * Shows loading state while checking authentication.
 *
 * @example
 * <AdminRoute requiredRole="admin">
 *   <AdminDashboard />
 * </AdminRoute>
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AdminRole = 'moderator' | 'editor' | 'admin' | 'super_admin';

interface AdminRouteProps {
  children: ReactNode;
  requiredRole?: AdminRole;
}

export function AdminRoute({ children, requiredRole = 'moderator' }: AdminRouteProps) {
  const { loading, isAdmin, isSuperAdmin, isModerator, isEditor, profile } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin privileges
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check specific role requirements
  const hasRequiredRole = (() => {
    switch (requiredRole) {
      case 'super_admin':
        return isSuperAdmin;
      case 'admin':
        return profile?.role === 'admin' || isSuperAdmin;
      case 'editor':
        return isEditor;
      case 'moderator':
        return isModerator;
      default:
        return false;
    }
  })();

  if (!hasRequiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Access Denied</h2>
            <p className="text-gray-300">
              You need <span className="font-semibold text-orange-400">{requiredRole}</span> privileges
              to access this page.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Your current role: <span className="font-semibold">{profile?.role}</span>
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if user has specific admin role
 */
export function useRequireRole(requiredRole: AdminRole): boolean {
  const { isAdmin, isSuperAdmin, isModerator, isEditor, profile } = useAuth();

  if (!isAdmin) return false;

  switch (requiredRole) {
    case 'super_admin':
      return isSuperAdmin;
    case 'admin':
      return profile?.role === 'admin' || isSuperAdmin;
    case 'editor':
      return isEditor;
    case 'moderator':
      return isModerator;
    default:
      return false;
  }
}
