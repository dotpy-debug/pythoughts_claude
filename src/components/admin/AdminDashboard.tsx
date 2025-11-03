/**
 * Admin Dashboard Main Component
 *
 * Provides the main admin dashboard with:
 * - Sidebar navigation
 * - Overview statistics
 * - Quick actions
 * - Recent activity
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardStats, type DashboardStats } from '../../actions/admin';
import {
  Users,
  FileText,
  MessageSquare,
  AlertTriangle,
  Ban,
  UserPlus,
  TrendingUp,
  Settings,
  BarChart,
  Shield,
  Database,
  Tag,
  FolderTree,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const loadStats = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getDashboardStats({ currentUserId: profile.id });
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: TrendingUp,
      path: '/admin',
      roles: ['moderator', 'editor', 'admin', 'super_admin'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      path: '/admin/users',
      roles: ['moderator', 'admin', 'super_admin'],
    },
    {
      id: 'content',
      label: 'Content Moderation',
      icon: FileText,
      path: '/admin/content',
      roles: ['moderator', 'editor', 'admin', 'super_admin'],
    },
    {
      id: 'reports',
      label: 'Reports Queue',
      icon: AlertTriangle,
      path: '/admin/reports',
      badge: stats?.pendingReports,
      roles: ['moderator', 'admin', 'super_admin'],
    },
    {
      id: 'categories',
      label: 'Categories & Tags',
      icon: Tag,
      path: '/admin/categories',
      roles: ['editor', 'admin', 'super_admin'],
    },
    {
      id: 'publications',
      label: 'Publications',
      icon: FolderTree,
      path: '/admin/publications',
      roles: ['editor', 'admin', 'super_admin'],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart,
      path: '/admin/analytics',
      roles: ['admin', 'super_admin'],
    },
    {
      id: 'database',
      label: 'Database Browser',
      icon: Database,
      path: '/admin/database',
      roles: ['super_admin'],
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      path: '/admin/settings',
      roles: ['admin', 'super_admin'],
    },
    {
      id: 'permissions',
      label: 'Roles & Permissions',
      icon: Shield,
      path: '/admin/permissions',
      roles: ['super_admin'],
    },
  ];

  const visibleItems = navigationItems.filter((item) =>
    item.roles.includes(profile?.role ?? 'user')
  );

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Total Posts',
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      label: 'Total Comments',
      value: stats?.totalComments ?? 0,
      icon: MessageSquare,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      label: 'Pending Reports',
      value: stats?.pendingReports ?? 0,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    {
      label: 'Active Suspensions',
      value: stats?.activeSuspensions ?? 0,
      icon: Ban,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      label: 'New Users Today',
      value: stats?.newUsersToday ?? 0,
      icon: UserPlus,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-orange-500 mr-3" />
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Logged in as{' '}
                <span className="font-semibold text-orange-400">{profile?.username}</span>
              </div>
              <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-xs font-semibold text-orange-400">
                {profile?.role?.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1 bg-gray-900 rounded-lg border border-gray-800 p-2">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200
                      ${
                        isActive
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Statistics Cards */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Platform Overview</h2>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({length: 6}).map((_, index) => (
                    <div
                      key={index}
                      className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse"
                    >
                      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
                      <div className="h-8 bg-gray-800 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className={`${card.bgColor} border ${card.borderColor} rounded-lg p-6 transition-all duration-200 hover:scale-105`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">{card.label}</span>
                          <Icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <div className={`text-3xl font-bold ${card.color}`}>
                          {card.value.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  to="/admin/users"
                  className="flex items-center px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-orange-500/50"
                >
                  <Users className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-gray-200">Manage Users</span>
                </Link>
                <Link
                  to="/admin/reports"
                  className="flex items-center px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-orange-500/50"
                >
                  <AlertTriangle className="w-5 h-5 text-orange-400 mr-3" />
                  <span className="text-gray-200">Review Reports</span>
                </Link>
                <Link
                  to="/admin/content"
                  className="flex items-center px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-orange-500/50"
                >
                  <FileText className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-gray-200">Moderate Content</span>
                </Link>
                <Link
                  to="/admin/analytics"
                  className="flex items-center px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-orange-500/50"
                >
                  <BarChart className="w-5 h-5 text-purple-400 mr-3" />
                  <span className="text-gray-200">View Analytics</span>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
