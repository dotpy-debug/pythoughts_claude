import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { ExternalLink } from 'lucide-react';

type Publication = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  allowCrossPosting: boolean;
  requireApproval: boolean;
  memberRole: string;
  canPublish: boolean;
};

type CrossPostDialogProperties = {
  postId: string;
  postTitle: string;
  currentPublicationId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CrossPostDialog({
  postId,
  postTitle,
  currentPublicationId,
  isOpen,
  onClose,
  onSuccess,
}: CrossPostDialogProperties) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedPublications, setSelectedPublications] = useState<Set<string>>(new Set());
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAvailablePublications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get publications where user is a member
      const { data: memberships, error: membershipsError } = await supabase
        .from('publication_members')
        .select(`
          publication_id,
          role,
          can_publish,
          publication:publication_id (
            id,
            slug,
            name,
            logo_url,
            allow_cross_posting,
            require_approval
          )
        `)
        .eq('user_id', user.id);

      if (membershipsError) {
        throw membershipsError;
      }

      // Get posts already cross-posted to check which publications to exclude
      const { data: existingPosts, error: existingError } = await supabase
        .from('publication_posts')
        .select('publication_id')
        .eq('post_id', postId);

      if (existingError) {
        throw existingError;
      }

      const existingPublicationIds = new Set(
        existingPosts?.map((p: { publication_id: string }) => p.publication_id) || []
      );

      // Define type for membership with publication (Supabase returns arrays for foreign keys)
      interface MembershipWithPublication {
        role?: string;
        can_publish?: boolean;
        publication: Array<{
          id: string;
          slug: string;
          name: string;
          logo_url?: string;
          allow_cross_posting: boolean;
          require_approval?: boolean;
        }>;
      }

      // Filter publications
      const availablePubs = (memberships || [])
        .filter((m: MembershipWithPublication) => {
          const pub = m.publication?.[0];
          return (
            pub &&
            pub.allow_cross_posting && // Publication allows cross-posting
            !existingPublicationIds.has(pub.id) && // Not already posted there
            pub.id !== currentPublicationId // Not the current publication
          );
        })
        .map((m: MembershipWithPublication) => {
          const pub = m.publication[0];
          return {
            id: pub.id,
            slug: pub.slug,
            name: pub.name,
            logoUrl: pub.logo_url ?? null,
            allowCrossPosting: pub.allow_cross_posting,
            requireApproval: pub.require_approval ?? false,
            memberRole: m.role ?? 'member',
            canPublish: m.can_publish ?? false,
          };
        });

      setPublications(availablePubs);
    } catch (error_) {
      logger.error('Failed to load publications', error_ as Error);
      setError(error_ instanceof Error ? error_.message : 'Failed to load publications');
    } finally {
      setIsLoading(false);
    }
  }, [postId, currentPublicationId]);

  useEffect(() => {
    if (isOpen) {
      loadAvailablePublications();
    }
  }, [isOpen, loadAvailablePublications]);

  const handleTogglePublication = (publicationId: string) => {
    setSelectedPublications((previous) => {
      const newSet = new Set(previous);
      if (newSet.has(publicationId)) {
        newSet.delete(publicationId);
      } else {
        newSet.add(publicationId);
      }
      return newSet;
    });
  };

  const handleCrossPost = async () => {
    if (selectedPublications.size === 0) {
      setError('Please select at least one publication');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Process each selected publication
      const results = await Promise.allSettled(
        [...selectedPublications].map(async (publicationId) => {
          const publication = publications.find((p) => p.id === publicationId);
          if (!publication) return;

          // If user can publish directly, add to publication_posts
          if (publication.canPublish && !publication.requireApproval) {
            const { error: postError } = await supabase.from('publication_posts').insert({
              publication_id: publicationId,
              post_id: postId,
              published_by: user.id,
              is_cross_posted: true,
              original_publication_id: currentPublicationId || null,
            });

            if (postError) throw postError;

            // Update publication post count
            await supabase.rpc('increment', {
              table_name: 'publications',
              column_name: 'post_count',
              row_id: publicationId,
            });

            logger.info('Post cross-posted directly', { publicationId });
          } else {
            // Submit for approval
            const { error: submissionError } = await supabase
              .from('publication_submissions')
              .insert({
                publication_id: publicationId,
                post_id: postId,
                submitter_id: user.id,
                submission_notes: submissionNotes.trim() || null,
                status: 'pending',
              });

            if (submissionError) throw submissionError;

            logger.info('Post submitted for cross-posting approval', { publicationId });
          }
        })
      );

      // Check for any failures
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        logger.error('Some cross-posts failed', { failures });
        setError(`${failures.length} publication(s) failed. Check console for details.`);
      } else {
        // Success
        setSelectedPublications(new Set());
        setSubmissionNotes('');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    } catch (error_) {
      logger.error('Failed to cross-post', error_ as Error);
      setError(error_ instanceof Error ? error_.message : 'Failed to cross-post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedPublications(new Set());
      setSubmissionNotes('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cross-Post to Publications</DialogTitle>
          <DialogDescription>
            Share "{postTitle}" with other publications you're a member of
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading publications...
            </div>
          ) : (publications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No publications available for cross-posting</p>
              <p className="text-sm text-muted-foreground mt-2">
                You need to be a member of other publications that allow cross-posting
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Publications</Label>
                <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-4">
                  {publications.map((pub) => (
                    <div
                      key={pub.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        id={`pub-${pub.id}`}
                        checked={selectedPublications.has(pub.id)}
                        onCheckedChange={() => handleTogglePublication(pub.id)}
                        disabled={isSubmitting}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {pub.logoUrl && (
                            <img
                              src={pub.logoUrl}
                              alt={pub.name}
                              className="w-8 h-8 rounded"
                            />
                          )}
                          <Label
                            htmlFor={`pub-${pub.id}`}
                            className="font-semibold cursor-pointer"
                          >
                            {pub.name}
                          </Label>
                          {pub.requireApproval && (
                            <Badge variant="secondary" className="text-xs">
                              Requires Approval
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {pub.memberRole}
                          </Badge>
                          {pub.canPublish && !pub.requireApproval && (
                            <span className="text-xs text-green-500">Auto-publish</span>
                          )}
                        </div>
                        <a
                          href={`/pub/${pub.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-1"
                        >
                          View publication
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPublications.size > 0 &&
                publications.some(
                  (p) => selectedPublications.has(p.id) && p.requireApproval
                ) && (
                  <div className="space-y-2">
                    <Label htmlFor="notes">Submission Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={submissionNotes}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                      placeholder="Add a note for the publication editors..."
                      rows={3}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      This note will be sent to publications that require approval
                    </p>
                  </div>
                )}
            </>
          ))}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {selectedPublications.size > 0 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-600">
                Selected {selectedPublications.size} publication
                {selectedPublications.size === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCrossPost}
            disabled={isSubmitting || selectedPublications.size === 0}
          >
            {isSubmitting ? 'Cross-Posting...' : 'Cross-Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
