/**
 * Publications Management Component
 *
 * Admin interface for managing publications:
 * - Publications directory with search
 * - Member management with role controls
 * - Submission review workflow
 * - Publication analytics
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPublications,
  updatePublication,
  deletePublication,
  getPublicationMembers,
  updateMemberRole,
  removeMember,
  getPublicationSubmissions,
  reviewSubmission,
  getPublicationStats,
  type Publication,
  type PublicationMember,
  type PublicationSubmission,
} from '../../actions/publications-admin';
import {
  BookOpen,
  Search,
  Users,
  FileText,
  Settings,
  Trash2,
  Check,
  X,
  RotateCcw,
  Loader2,
  Eye,
  TrendingUp,
  Crown,
  Edit3,
  PenTool,
  UserPlus,
} from 'lucide-react';

export function PublicationsManagement() {
  const { profile } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [members, setMembers] = useState<PublicationMember[]>([]);
  const [submissions, setSubmissions] = useState<PublicationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'submissions'>('overview');
  const [stats, setStats] = useState({
    totalPublications: 0,
    totalMembers: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
  });

  const loadPublications = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getPublications({
        currentUserId: profile.id,
        search: searchTerm || undefined,
      });

      if (result.publications) {
        setPublications(result.publications);
      }
    } catch (error) {
      console.error('Error loading publications:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, searchTerm]);

  const loadStats = useCallback(async () => {
    if (!profile) return;

    const result = await getPublicationStats({ currentUserId: profile.id });
    if (result.stats) {
      setStats(result.stats);
    }
  }, [profile]);

  const loadPublicationDetails = useCallback(async () => {
    if (!profile || !selectedPublication) return;

    if (activeTab === 'members') {
      const result = await getPublicationMembers({
        currentUserId: profile.id,
        publicationId: selectedPublication.id,
      });
      if (result.members) {
        setMembers(result.members);
      }
    } else if (activeTab === 'submissions') {
      const result = await getPublicationSubmissions({
        currentUserId: profile.id,
        publicationId: selectedPublication.id,
      });
      if (result.submissions) {
        setSubmissions(result.submissions);
      }
    }
  }, [profile, selectedPublication, activeTab]);

  useEffect(() => {
    if (profile) {
      loadPublications();
      loadStats();
    }
  }, [profile, loadPublications, loadStats]);

  useEffect(() => {
    if (selectedPublication) {
      loadPublicationDetails();
    }
  }, [selectedPublication, loadPublicationDetails]);

  const handleToggleVisibility = async (pub: Publication) => {
    if (!profile) return;

    await updatePublication({
      currentUserId: profile.id,
      publicationId: pub.id,
      updates: { is_public: !pub.is_public },
    });

    loadPublications();
  };

  const handleDeletePublication = async (pubId: string) => {
    if (!profile) return;
    if (!confirm('Are you sure you want to delete this publication? This action cannot be undone.'))
      return;

    await deletePublication({
      currentUserId: profile.id,
      publicationId: pubId,
    });

    setSelectedPublication(null);
    loadPublications();
    loadStats();
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    role: 'owner' | 'editor' | 'writer' | 'contributor'
  ) => {
    if (!profile) return;

    await updateMemberRole({
      currentUserId: profile.id,
      memberId,
      role,
    });

    loadPublicationDetails();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!profile) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    await removeMember({
      currentUserId: profile.id,
      memberId,
    });

    loadPublicationDetails();
  };

  const handleReviewSubmission = async (
    submissionId: string,
    status: 'approved' | 'rejected' | 'revision_requested',
    notes?: string
  ) => {
    if (!profile) return;

    await reviewSubmission({
      currentUserId: profile.id,
      submissionId,
      status,
      reviewNotes: notes,
    });

    loadPublicationDetails();
    loadStats();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'editor':
        return <Edit3 className="w-4 h-4" />;
      case 'writer':
        return <PenTool className="w-4 h-4" />;
      case 'contributor':
        return <UserPlus className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-400';
      case 'editor':
        return 'text-purple-400';
      case 'writer':
        return 'text-blue-400';
      case 'contributor':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      revision_requested: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full border ${
          styles[status as keyof typeof styles] || 'bg-gray-500/20 text-gray-400'
        }`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading && publications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading publications...</p>
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
            <BookOpen className="w-8 h-8 text-orange-500 mr-3" />
            Publications Management
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Publications</p>
                <p className="text-2xl font-bold text-white">{stats.totalPublications}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Members</p>
                <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Submissions</p>
                <p className="text-2xl font-bold text-white">{stats.totalSubmissions}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Reviews</p>
                <p className="text-2xl font-bold text-white">{stats.pendingSubmissions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Publications List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-lg">
              {/* Search */}
              <div className="p-4 border-b border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search publications..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Publications List */}
              <div className="max-h-[600px] overflow-y-auto">
                {publications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No publications found</p>
                  </div>
                ) : (
                  publications.map((pub) => (
                    <button
                      key={pub.id}
                      onClick={() => setSelectedPublication(pub)}
                      className={`w-full text-left p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                        selectedPublication?.id === pub.id ? 'bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{pub.name}</h3>
                          <p className="text-sm text-gray-400 truncate">{pub.slug}</p>
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-xs text-gray-500">
                              <Users className="w-3 h-3 inline mr-1" />
                              {pub.member_count} members
                            </span>
                            <span className="text-xs text-gray-500">
                              <FileText className="w-3 h-3 inline mr-1" />
                              {pub.post_count} posts
                            </span>
                          </div>
                        </div>
                        {!pub.is_public && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                            Private
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Publication Details */}
          <div className="lg:col-span-2">
            {selectedPublication ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg">
                {/* Publication Header */}
                <div className="p-6 border-b border-gray-800">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-white">{selectedPublication.name}</h2>
                      <p className="text-sm text-gray-400">{selectedPublication.tagline}</p>
                      <p className="text-xs text-gray-500 mt-1">/{selectedPublication.slug}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePublication(selectedPublication.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete publication"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Publication Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-400">Members</p>
                      <p className="text-lg font-bold text-white">{selectedPublication.member_count}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-400">Posts</p>
                      <p className="text-lg font-bold text-white">{selectedPublication.post_count}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-400">Subscribers</p>
                      <p className="text-lg font-bold text-white">
                        {selectedPublication.subscriber_count}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleVisibility(selectedPublication)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedPublication.is_public
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {selectedPublication.is_public ? (
                        <>
                          <Eye className="w-4 h-4 inline mr-2" />
                          Public
                        </>
                      ) : (
                        <>Private</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-800">
                  <div className="flex space-x-1 p-2">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'overview'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('members')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'members'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Users className="w-4 h-4 inline mr-2" />
                      Members
                    </button>
                    <button
                      onClick={() => setActiveTab('submissions')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'submissions'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <FileText className="w-4 h-4 inline mr-2" />
                      Submissions
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Description</h3>
                        <p className="text-gray-200">{selectedPublication.description || 'No description'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-2">Settings</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Allow Submissions</span>
                              <span className={selectedPublication.allow_submissions ? 'text-green-400' : 'text-gray-500'}>
                                {selectedPublication.allow_submissions ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Require Approval</span>
                              <span className={selectedPublication.require_approval ? 'text-yellow-400' : 'text-gray-500'}>
                                {selectedPublication.require_approval ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-2">Dates</h3>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-400">Created: </span>
                              <span className="text-gray-200">
                                {new Date(selectedPublication.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Updated: </span>
                              <span className="text-gray-200">
                                {new Date(selectedPublication.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'members' && (
                    <div>
                      {members.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">No members found</p>
                      ) : (
                        <div className="space-y-3">
                          {members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`${getRoleColor(member.role)}`}>
                                  {getRoleIcon(member.role)}
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {(member as any).profiles?.username || 'Unknown'}
                                  </p>
                                  <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleUpdateMemberRole(
                                      member.id,
                                      e.target.value as 'owner' | 'editor' | 'writer' | 'contributor'
                                    )
                                  }
                                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200"
                                >
                                  <option value="owner">Owner</option>
                                  <option value="editor">Editor</option>
                                  <option value="writer">Writer</option>
                                  <option value="contributor">Contributor</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'submissions' && (
                    <div>
                      {submissions.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">No submissions found</p>
                      ) : (
                        <div className="space-y-3">
                          {submissions.map((submission) => (
                            <div key={submission.id} className="p-4 bg-gray-800 rounded-lg">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="text-white font-medium">
                                    {(submission as any).posts?.title || 'Untitled Post'}
                                  </h4>
                                  <p className="text-sm text-gray-400">
                                    by {(submission as any).submitter?.username || 'Unknown'}
                                  </p>
                                </div>
                                {getStatusBadge(submission.status)}
                              </div>
                              {submission.submission_notes && (
                                <p className="text-sm text-gray-400 mb-3">{submission.submission_notes}</p>
                              )}
                              {submission.status === 'pending' && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleReviewSubmission(submission.id, 'approved')}
                                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm flex items-center"
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReviewSubmission(submission.id, 'revision_requested')}
                                    className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-sm flex items-center"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Request Changes
                                  </button>
                                  <button
                                    onClick={() => handleReviewSubmission(submission.id, 'rejected')}
                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm flex items-center"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </button>
                                </div>
                              )}
                              {submission.review_notes && (
                                <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
                                  <p className="text-xs text-gray-500 mb-1">Review Notes:</p>
                                  <p className="text-sm text-gray-300">{submission.review_notes}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400">Select a publication to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
