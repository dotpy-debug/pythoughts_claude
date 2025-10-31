/**
 * Analytics Dashboard Component
 *
 * Comprehensive analytics and insights dashboard with:
 * - User growth charts
 * - Content statistics
 * - Engagement metrics
 * - Trending content
 * - Data export functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAnalytics, exportAnalytics, type AnalyticsData } from '../../actions/analytics';
import { LineChart, BarChart, PieChart, StatCard } from '../charts/SimpleChart';
import {
  BarChart as BarChartIcon,
  TrendingUp,
  Users,
  FileText,
  MessageSquare,
  Activity,
  Download,
  Loader2,
  Eye,
  ThumbsUp,
  Star,
} from 'lucide-react';

export function AnalyticsDashboard() {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [exporting, setExporting] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getAnalytics({
        currentUserId: profile.id,
        dateRange,
      });

      if (result.data) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, dateRange]);

  useEffect(() => {
    if (profile) {
      loadAnalytics();
    }
  }, [profile, loadAnalytics]);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!profile) return;

    setExporting(true);
    try {
      const result = await exportAnalytics({
        currentUserId: profile.id,
        format,
      });

      if (result.data) {
        const blob = new Blob([result.data], {
          type: format === 'json' ? 'application/json' : 'text/csv',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString()}.${format}`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    } finally {
      setExporting(false);
    }
  };

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
  ];

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">Failed to load analytics data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <BarChartIcon className="w-8 h-8 text-orange-500 mr-3" />
            Platform Analytics
          </h1>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-200 flex items-center"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={analytics.recentActivity.totalUsers.toLocaleString()}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="Total Posts"
            value={analytics.recentActivity.totalPosts.toLocaleString()}
            icon={FileText}
            color="green"
          />
          <StatCard
            label="Total Comments"
            value={analytics.recentActivity.totalComments.toLocaleString()}
            icon={MessageSquare}
            color="purple"
          />
          <StatCard
            label="Active Users (24h)"
            value={analytics.recentActivity.activeUsers.toLocaleString()}
            icon={Activity}
            color="orange"
          />
        </div>

        {/* User Growth Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
            User Growth
          </h2>
          <LineChart data={analytics.userGrowth} height={250} color="#f97316" />
        </div>

        {/* Content Statistics and Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Content Stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Content Distribution</h2>
            <PieChart data={analytics.contentStats} size={200} />
          </div>

          {/* Engagement Metrics */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Engagement Metrics</h2>
            <BarChart data={analytics.engagementMetrics} height={200} />
          </div>
        </div>

        {/* Top Categories and Tags */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Categories */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Categories</h2>
            {analytics.topCategories.length > 0 ? (
              <div className="space-y-3">
                {analytics.topCategories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 font-mono text-sm">#{i + 1}</span>
                      <span className="text-gray-200">{cat.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-800 rounded-full px-3 py-1 text-sm text-gray-300">
                        {cat.value} posts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No category data available</p>
            )}
          </div>

          {/* Top Tags */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Tags</h2>
            {analytics.topTags.length > 0 ? (
              <div className="space-y-3">
                {analytics.topTags.map((tag, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 font-mono text-sm">#{i + 1}</span>
                      <span className="text-gray-200">#{tag.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-800 rounded-full px-3 py-1 text-sm text-gray-300">
                        {tag.value} posts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No tag data available</p>
            )}
          </div>
        </div>

        {/* Trending Posts */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Star className="w-5 h-5 text-orange-500 mr-2" />
            Trending Posts
          </h2>
          {analytics.trendingPosts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Title</th>
                    <th className="pb-3 pr-4 text-center">
                      <Eye className="w-4 h-4 inline" />
                    </th>
                    <th className="pb-3 pr-4 text-center">
                      <ThumbsUp className="w-4 h-4 inline" />
                    </th>
                    <th className="pb-3 text-center">
                      <MessageSquare className="w-4 h-4 inline" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {analytics.trendingPosts.map((post, i) => (
                    <tr key={post.id} className="hover:bg-gray-800/50">
                      <td className="py-3 pr-4 text-gray-500 font-mono text-sm">{i + 1}</td>
                      <td className="py-3 pr-4 text-gray-200">{post.title}</td>
                      <td className="py-3 pr-4 text-center text-gray-400">{post.view_count}</td>
                      <td className="py-3 pr-4 text-center text-gray-400">{post.vote_count}</td>
                      <td className="py-3 text-center text-gray-400">{post.comment_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No trending posts available</p>
          )}
        </div>
      </div>
    </div>
  );
}
