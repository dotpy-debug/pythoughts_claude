import { useState, useEffect } from 'react';
import { X, History, RotateCcw, Clock, User, FileText, CheckCircle } from 'lucide-react';
import { PostVersion } from '../../lib/supabase';
import { getPostVersions, restorePostVersion } from '../../actions/versions';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { logger } from '../../lib/logger';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postAuthorId: string;
  onVersionRestored?: () => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  postId,
  postAuthorId,
  onVersionRestored,
}: VersionHistoryModalProps) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  const isAuthor = user?.id === postAuthorId;

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, postId]);

  const loadVersions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPostVersions(postId);
      setVersions(data);
    } catch (err) {
      if (err instanceof Error) {
        logger.error('Error loading versions', err, { postId });
      } else {
        logger.error('Error loading versions', { errorMessage: String(err), postId });
      }
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    if (!user || !isAuthor) {
      setError('Only the post author can restore versions');
      return;
    }

    setRestoring(true);
    setError('');

    try {
      const result = await restorePostVersion(postId, versionNumber, user.id);

      if (result.success) {
        onVersionRestored?.();
        onClose();
      } else {
        setError(result.error || 'Failed to restore version');
      }
    } catch (err) {
      if (err instanceof Error) {
        logger.error('Error restoring version', err, { postId, versionNumber });
      } else {
        logger.error('Error restoring version', { errorMessage: String(err), postId, versionNumber });
      }
      setError('An unexpected error occurred');
    } finally {
      setRestoring(false);
    }
  };

  const getChangeSummary = (version: PostVersion, index: number) => {
    if (index === versions.length - 1) {
      return 'Initial version';
    }

    const changes: string[] = [];
    const nextVersion = versions[index + 1];

    if (version.title !== nextVersion?.title) changes.push('title');
    if (version.content !== nextVersion?.content) changes.push('content');
    if (version.subtitle !== nextVersion?.subtitle) changes.push('subtitle');
    if (version.category !== nextVersion?.category) changes.push('category');
    if (version.image_url !== nextVersion?.image_url) changes.push('image');

    return changes.length > 0 ? `Changed: ${changes.join(', ')}` : 'Minor edits';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700 shrink-0">
          <div className="flex items-center space-x-2">
            <History className="text-terminal-green" size={20} />
            <span className="text-gray-100 font-mono font-semibold">
              Version History
            </span>
            {versions.length > 0 && (
              <span className="text-xs text-gray-500 font-mono">
                ({versions.length} version{versions.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 font-mono text-sm">Loading versions...</div>
            </div>
          ) : error && versions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-400 font-mono text-sm">{error}</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <FileText className="text-gray-600" size={48} />
              <div className="text-gray-500 font-mono text-sm">No version history available</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 transition-colors ${
                    selectedVersion?.id === version.id ? 'bg-gray-800' : 'hover:bg-gray-850'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-terminal-green font-mono font-semibold">
                            v{version.version_number}
                          </span>
                          {version.is_major_edit && (
                            <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-mono border border-orange-500/30">
                              Major
                            </span>
                          )}
                          {index === 0 && (
                            <span className="bg-terminal-green/20 text-terminal-green text-xs px-2 py-0.5 rounded font-mono border border-terminal-green/30 flex items-center space-x-1">
                              <CheckCircle size={12} />
                              <span>Current</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono">
                          <Clock size={12} />
                          <span>{formatDistanceToNow(version.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mb-2">
                        <User size={14} className="text-gray-500" />
                        <span className="text-sm text-gray-400 font-mono">
                          {version.profiles?.username || 'Unknown'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500 font-mono mb-2">
                        {getChangeSummary(version, index)}
                      </div>

                      {version.change_description && (
                        <div className="text-sm text-gray-400 font-mono italic">
                          "{version.change_description}"
                        </div>
                      )}

                      {selectedVersion?.id === version.id && (
                        <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
                          <h4 className="text-sm font-mono font-semibold text-gray-300 mb-2">
                            {version.title}
                          </h4>
                          {version.subtitle && (
                            <p className="text-sm text-gray-400 font-mono mb-2 italic">
                              {version.subtitle}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 font-mono line-clamp-4">
                            {version.content}
                          </div>
                          {version.category && (
                            <div className="mt-2">
                              <span className="text-xs bg-terminal-purple/20 text-terminal-purple px-2 py-1 rounded font-mono border border-terminal-purple/30">
                                {version.category}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {isAuthor && index !== 0 && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(version.version_number);
                        }}
                        disabled={restoring}
                        variant="ghost"
                        size="sm"
                        className="font-mono text-xs ml-4"
                      >
                        <RotateCcw size={14} className="mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-900/30 border-t border-red-500/50 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
