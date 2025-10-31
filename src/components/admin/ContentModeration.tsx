/**
 * Content Moderation Component
 *
 * Comprehensive content moderation interface with:
 * - Reports queue
 * - Post moderation
 * - Comment moderation
 * - Bulk actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getContentReports,
  updateReportStatus,
  getPostsForModeration,
  deletePost,
  toggleFeaturedPost,
  getCommentsForModeration,
  deleteComment,
  bulkDeletePosts,
  bulkDeleteComments,
} from '../../actions/content-moderation';
import type { ContentReport, Post, Comment } from '../../lib/supabase';
import {
  AlertTriangle,
  FileText,
  MessageSquare,
  Trash2,
  Star,
  Flag,
  Loader2,
  Search,
} from 'lucide-react';

type TabType = 'reports' | 'posts' | 'comments';

export function ContentModeration() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [loading, setLoading] = useState(true);

  // Reports state
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [reportStatus, setReportStatus] = useState<string>('pending');
  const [reportsTotal, setReportsTotal] = useState(0);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postFilter, setPostFilter] = useState<string>('all');
  const [postSearch, setPostSearch] = useState('');
  const [postsTotal, setPostsTotal] = useState(0);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const result = await getContentReports({
          currentUserId: profile.id,
          status: reportStatus as "pending" | "reviewing" | "resolved" | "dismissed" | undefined,
          page,
        });
        if (!result.error) {
          setReports(result.reports);
          setReportsTotal(result.total);
        }
      } else if (activeTab === 'posts') {
        const result = await getPostsForModeration({
          currentUserId: profile.id,
          filter: postFilter as "all" | "published" | "flagged" | "drafts" | undefined,
          search: postSearch || undefined,
          page,
        });
        if (!result.error) {
          setPosts(result.posts);
          setPostsTotal(result.total);
        }
      } else if (activeTab === 'comments') {
        const result = await getCommentsForModeration({
          currentUserId: profile.id,
          page,
        });
        if (!result.error) {
          setComments(result.comments);
          setCommentsTotal(result.total);
        }
      }
    } catch (error) {
      console.error('Error loading moderation data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, activeTab, page, reportStatus, postFilter, postSearch]);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile, loadData]);

  const handleReportAction = async (
    reportId: string,
    status: 'reviewing' | 'resolved' | 'dismissed',
    notes?: string
  ) => {
    if (!profile) return;

    const result = await updateReportStatus({
      currentUserId: profile.id,
      reportId,
      status,
      resolutionNotes: notes,
    });

    if (result.success) {
      await loadData();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!profile) return;

    const reason = window.prompt('Enter reason for deletion:');
    if (!reason) return;

    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (!confirmed) return;

    const result = await deletePost({
      currentUserId: profile.id,
      postId,
      reason,
    });

    if (result.success) {
      await loadData();
    }
  };

  const handleToggleFeatured = async (postId: string, featured: boolean) => {
    if (!profile) return;

    const result = await toggleFeaturedPost({
      currentUserId: profile.id,
      postId,
      featured: !featured,
    });

    if (result.success) {
      await loadData();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!profile) return;

    const reason = window.prompt('Enter reason for deletion:');
    if (!reason) return;

    const confirmed = window.confirm('Are you sure you want to delete this comment?');
    if (!confirmed) return;

    const result = await deleteComment({
      currentUserId: profile.id,
      commentId,
      reason,
    });

    if (result.success) {
      await loadData();
    }
  };

  const handleBulkDeletePosts = async () => {
    if (!profile || selectedPosts.size === 0) return;

    const reason = window.prompt('Enter reason for bulk deletion:');
    if (!reason) return;

    const confirmed = window.confirm(
      `Delete ${selectedPosts.size} posts? This action cannot be undone.`
    );
    if (!confirmed) return;

    const result = await bulkDeletePosts({
      currentUserId: profile.id,
      postIds: Array.from(selectedPosts),
      reason,
    });

    if (result.success) {
      setSelectedPosts(new Set());
      await loadData();
    }
  };

  const handleBulkDeleteComments = async () => {
    if (!profile || selectedComments.size === 0) return;

    const reason = window.prompt('Enter reason for bulk deletion:');
    if (!reason) return;

    const confirmed = window.confirm(
      `Delete ${selectedComments.size} comments? This action cannot be undone.`
    );
    if (!confirmed) return;

    const result = await bulkDeleteComments({
      currentUserId: profile.id,
      commentIds: Array.from(selectedComments),
      reason,
    });

    if (result.success) {
      setSelectedComments(new Set());
      await loadData();
    }
  };

  const tabs = [
    { id: 'reports', label: 'Reports Queue', icon: AlertTriangle, count: reportsTotal },
    { id: 'posts', label: 'Posts', icon: FileText, count: postsTotal },
    { id: 'comments', label: 'Comments', icon: MessageSquare, count: commentsTotal },
  ];

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Flag className="w-8 h-8 text-orange-500 mr-3" />
          Content Moderation
        </h1>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setPage(1);
                }}
                className={`
                  px-4 py-3 flex items-center space-x-2 border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            {/* Filter */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <select
                value={reportStatus}
                onChange={(e) => {
                  setReportStatus(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
              >
                <option value="">All Reports</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-gray-400">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-400">
                  No reports found
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              report.status === 'pending'
                                ? 'bg-orange-500/20 text-orange-400'
                                : report.status === 'resolved'
                                ? 'bg-green-500/20 text-green-400'
                                : report.status === 'dismissed'
                                ? 'bg-gray-500/20 text-gray-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {report.status.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
                            {report.report_type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-2">{report.reason}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            Reporter:{' '}
                            <span className="text-gray-400">
                              {report.reporter_profile?.username}
                            </span>
                          </span>
                          {report.reported_user_profile && (
                            <span>
                              Reported User:{' '}
                              <span className="text-gray-400">
                                {report.reported_user_profile.username}
                              </span>
                            </span>
                          )}
                          <span className="text-gray-500">
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {report.status === 'pending' && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleReportAction(report.id, 'reviewing')}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded text-sm transition-colors"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => {
                              const notes = window.prompt('Resolution notes:');
                              if (notes) handleReportAction(report.id, 'resolved', notes);
                            }}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded text-sm transition-colors"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleReportAction(report.id, 'dismissed')}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                    {report.resolution_notes && (
                      <div className="mt-3 p-3 bg-gray-800 rounded border-l-4 border-green-500">
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold text-green-400">Resolution:</span>{' '}
                          {report.resolution_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div>
            {/* Filters and Search */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  />
                </div>
                <select
                  value={postFilter}
                  onChange={(e) => {
                    setPostFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                >
                  <option value="all">All Posts</option>
                  <option value="published">Published</option>
                  <option value="drafts">Drafts</option>
                  <option value="flagged">Flagged</option>
                </select>
                {selectedPosts.size > 0 && (
                  <button
                    onClick={handleBulkDeletePosts}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                  >
                    Delete Selected ({selectedPosts.size})
                  </button>
                )}
              </div>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-gray-400">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-400">
                  No posts found
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedPosts.has(post.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedPosts);
                          if (e.target.checked) {
                            newSelected.add(post.id);
                          } else {
                            newSelected.delete(post.id);
                          }
                          setSelectedPosts(newSelected);
                        }}
                        className="mt-1 mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {post.featured && (
                            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          )}
                          <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {post.content.substring(0, 200)}...
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            By{' '}
                            <span className="text-gray-400">{post.profiles?.username}</span>
                          </span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          {post.post_stats && (
                            <>
                              <span>{post.post_stats.view_count} views</span>
                              <span>{post.vote_count} votes</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleToggleFeatured(post.id, post.featured)}
                          className={`p-2 rounded transition-colors ${
                            post.featured
                              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                          title={post.featured ? 'Unfeature' : 'Feature'}
                        >
                          <Star className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div>
            {/* Bulk Actions */}
            {selectedComments.size > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
                <button
                  onClick={handleBulkDeleteComments}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                >
                  Delete Selected ({selectedComments.size})
                </button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-gray-400">Loading comments...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-400">
                  No comments found
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedComments.has(comment.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedComments);
                          if (e.target.checked) {
                            newSelected.add(comment.id);
                          } else {
                            newSelected.delete(comment.id);
                          }
                          setSelectedComments(newSelected);
                        }}
                        className="mt-1 mr-4"
                      />
                      <div className="flex-1">
                        <p className="text-gray-300 mb-2">{comment.content}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            By{' '}
                            <span className="text-gray-400">
                              {comment.profiles?.username}
                            </span>
                          </span>
                          <span>{new Date(comment.created_at).toLocaleString()}</span>
                          <span>{comment.vote_count} votes</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors ml-4"
                        title="Delete comment"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {((activeTab === 'reports' && reportsTotal > 50) ||
          (activeTab === 'posts' && postsTotal > 50) ||
          (activeTab === 'comments' && commentsTotal > 50)) && (
          <div className="flex items-center justify-between mt-6 px-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="text-gray-400">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
