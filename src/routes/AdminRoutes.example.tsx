/**
 * Admin Routes Example
 *
 * This file demonstrates how to set up routes for the admin dashboard.
 * Copy this structure into your main router configuration.
 *
 * @example
 * import { AdminRoutes } from './routes/AdminRoutes';
 *
 * function App() {
 *   return (
 *     <Router>
 *       <Routes>
 *         {/* ... other routes ... *\/}
 *         <Route path="/admin/*" element={<AdminRoutes />} />
 *       </Routes>
 *     </Router>
 *   );
 * }
 */

import { Routes, Route } from 'react-router-dom';
import { AdminRoute } from '../components/auth/AdminRoute';
import {
  AdminDashboard,
  UserManagement,
  ContentModeration,
  DatabaseBrowser,
  SystemSettings,
} from '../components/admin';

export function AdminRoutes() {
  return (
    <Routes>
      {/* Dashboard - accessible to all admin roles */}
      <Route
        path="/"
        element={
          <AdminRoute requiredRole="moderator">
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* User Management - moderators and above */}
      <Route
        path="/users"
        element={
          <AdminRoute requiredRole="moderator">
            <UserManagement />
          </AdminRoute>
        }
      />

      {/* Content Moderation - moderators and above */}
      <Route
        path="/content"
        element={
          <AdminRoute requiredRole="moderator">
            <ContentModeration />
          </AdminRoute>
        }
      />

      {/* Reports Queue - moderators and above */}
      <Route
        path="/reports"
        element={
          <AdminRoute requiredRole="moderator">
            <ContentModeration />
          </AdminRoute>
        }
      />

      {/* Database Browser - super admin only */}
      <Route
        path="/database"
        element={
          <AdminRoute requiredRole="super_admin">
            <DatabaseBrowser />
          </AdminRoute>
        }
      />

      {/* System Settings - admin and super admin */}
      <Route
        path="/settings"
        element={
          <AdminRoute requiredRole="admin">
            <SystemSettings />
          </AdminRoute>
        }
      />

      {/* Analytics Dashboard - admin and super admin */}
      <Route
        path="/analytics"
        element={
          <AdminRoute requiredRole="admin">
            <div className="min-h-screen bg-gray-950 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-white mb-6">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-400">
                  Analytics dashboard coming soon...
                </p>
              </div>
            </div>
          </AdminRoute>
        }
      />

      {/* Categories & Tags - editors and above */}
      <Route
        path="/categories"
        element={
          <AdminRoute requiredRole="editor">
            <div className="min-h-screen bg-gray-950 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-white mb-6">
                  Categories & Tags Management
                </h1>
                <p className="text-gray-400">
                  Categories and tags management coming soon...
                </p>
              </div>
            </div>
          </AdminRoute>
        }
      />

      {/* Publications - editors and above */}
      <Route
        path="/publications"
        element={
          <AdminRoute requiredRole="editor">
            <div className="min-h-screen bg-gray-950 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-white mb-6">
                  Publications Management
                </h1>
                <p className="text-gray-400">
                  Publications management coming soon...
                </p>
              </div>
            </div>
          </AdminRoute>
        }
      />

      {/* Permissions & Roles - super admin only */}
      <Route
        path="/permissions"
        element={
          <AdminRoute requiredRole="super_admin">
            <div className="min-h-screen bg-gray-950 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-white mb-6">
                  Roles & Permissions
                </h1>
                <p className="text-gray-400">
                  Permissions management coming soon...
                </p>
              </div>
            </div>
          </AdminRoute>
        }
      />
    </Routes>
  );
}
