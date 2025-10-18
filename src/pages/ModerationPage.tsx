import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Terminal, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { ShadcnButton } from '../components/ui/ShadcnButton';
import { useNavigate } from 'react-router-dom';

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  category: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  moderator_id: string | null;
  moderator_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter?: {
    username: string;
  };
  reported_user?: {
    username: string;
  };
  post?: {
    title: string;
    content: string;
  };
  comment?: {
    content: string;
  };
};

type StatusFilter = 'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export function ModerationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:reporter_id(username),
          reported_user:reported_user_id(username),
          post:post_id(title, content),
          comment:comment_id(content)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: Report['status']) => {
    if (!user) return;

    try {
      setUpdating(true);

      const updateData: any = {
        status: newStatus,
        moderator_id: user.id,
        moderator_notes: moderatorNotes.trim() || null,
      };

      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      // Reload reports
      await loadReports();
      setSelectedReport(null);
      setModeratorNotes('');
    } catch (error) {
      console.error('Error updating report:', error);
    } finally {
      setUpdating(false);
    }
  };

  const viewContent = (report: Report) => {
    if (report.post_id) {
      navigate(`/post/${report.post_id}`);
    } else if (report.comment_id) {
      // Navigate to the post containing the comment
      // Note: You'll need to modify this based on your comment structure
      navigate(`/`);
    }
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'reviewed':
        return 'text-blue-500';
      case 'resolved':
        return 'text-green-500';
      case 'dismissed':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle size={16} />;
      case 'reviewed':
        return <Eye size={16} />;
      case 'resolved':
        return <CheckCircle size={16} />;
      case 'dismissed':
        return <XCircle size={16} />;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 font-mono">Please sign in to access the moderation queue</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Terminal size={16} className="text-terminal-green" />
            <span className="text-gray-100 font-mono text-sm">moderation_queue.sh</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-mono">
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Status Filter */}
        <div className="p-4 border-b border-gray-700 bg-gray-850">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded font-mono text-sm transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-terminal-green text-gray-900 font-semibold'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        <div className="divide-y divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 font-mono">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-mono">
              No {statusFilter !== 'all' ? statusFilter : ''} reports found
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="p-4 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`flex items-center space-x-1 font-mono text-sm ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span className="uppercase">{report.status}</span>
                      </span>
                      <span className="text-xs bg-terminal-purple/20 text-terminal-purple px-2 py-0.5 rounded font-mono border border-terminal-purple/30">
                        {report.category}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm font-mono">
                      <p className="text-gray-300">
                        <span className="text-gray-500">Reason:</span> {report.reason}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Reporter:</span> {report.reporter?.username || 'Unknown'}
                      </p>
                      {report.reported_user && (
                        <p className="text-gray-400">
                          <span className="text-gray-500">Reported User:</span> {report.reported_user.username}
                        </p>
                      )}
                      <p className="text-gray-400">
                        <span className="text-gray-500">Content Type:</span> {report.post_id ? 'Post' : 'Comment'}
                      </p>
                    </div>

                    {report.description && (
                      <p className="mt-2 text-xs text-gray-500 font-mono italic">
                        "{report.description}"
                      </p>
                    )}
                  </div>

                  <ShadcnButton
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewContent(report);
                    }}
                  >
                    View Content
                  </ShadcnButton>
                </div>

                {/* Expanded Details */}
                {selectedReport?.id === report.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="bg-gray-850 rounded p-4 mb-4">
                      <p className="text-xs text-gray-500 font-mono mb-2">CONTENT PREVIEW:</p>
                      {report.post && (
                        <div>
                          <p className="text-sm font-semibold text-gray-200 font-mono mb-1">{report.post.title}</p>
                          <p className="text-sm text-gray-400 font-mono line-clamp-3">{report.post.content}</p>
                        </div>
                      )}
                      {report.comment && (
                        <p className="text-sm text-gray-400 font-mono">{report.comment.content}</p>
                      )}
                    </div>

                    {report.moderator_notes && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 font-mono mb-1">MODERATOR NOTES:</p>
                        <p className="text-sm text-gray-300 font-mono">{report.moderator_notes}</p>
                      </div>
                    )}

                    {report.status === 'pending' || report.status === 'reviewed' ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 font-mono mb-1">
                            MODERATOR NOTES:
                          </label>
                          <textarea
                            value={moderatorNotes}
                            onChange={(e) => setModeratorNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono text-sm resize-none"
                            placeholder="Add notes about your decision..."
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          {report.status === 'pending' && (
                            <ShadcnButton
                              onClick={() => updateReportStatus(report.id, 'reviewed')}
                              disabled={updating}
                              variant="outline"
                              size="sm"
                            >
                              Mark as Reviewed
                            </ShadcnButton>
                          )}
                          <ShadcnButton
                            onClick={() => updateReportStatus(report.id, 'resolved')}
                            disabled={updating}
                            variant="default"
                            size="sm"
                          >
                            Resolve
                          </ShadcnButton>
                          <ShadcnButton
                            onClick={() => updateReportStatus(report.id, 'dismissed')}
                            disabled={updating}
                            variant="outline"
                            size="sm"
                          >
                            Dismiss
                          </ShadcnButton>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-mono">
                        Resolved by moderator on {report.resolved_at ? new Date(report.resolved_at).toLocaleString() : 'N/A'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
