import { useState } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { formatDistanceToNow } from 'date-fns';

type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

type Submission = {
  id: string;
  publicationId: string;
  postId: string;
  submitterId: string;
  status: SubmissionStatus;
  submissionNotes: string | null;
  reviewNotes: string | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  createdAt: string;

  // Joined data
  post: {
    id: string;
    title: string;
    content: string;
    excerpt: string | null;
  };
  submitter: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  reviewer?: {
    id: string;
    username: string;
    displayName: string | null;
  };
};

type SubmissionReviewProps = {
  submission: Submission;
  onReviewed: () => void;
};

export function SubmissionReview({ submission, onReviewed }: SubmissionReviewProps) {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusBadge = (status: SubmissionStatus) => {
    const statusConfig = {
      pending: { label: 'Pending Review', variant: 'secondary' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      rejected: { label: 'Rejected', variant: 'destructive' as const },
      revision_requested: { label: 'Revision Requested', variant: 'outline' as const },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleReview = async () => {
    if (!reviewAction) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (reviewAction === 'approve') {
        // Use database function to approve submission
        const { error: approveError } = await supabase.rpc('approve_publication_submission', {
          p_submission_id: submission.id,
          p_reviewer_id: user.id,
          p_notes: reviewNotes.trim() || null,
        });

        if (approveError) {
          throw approveError;
        }

        logger.info('Submission approved', { submissionId: submission.id });
      } else {
        // Update submission status
        const { error: updateError } = await supabase
          .from('publication_submissions')
          .update({
            status: reviewAction === 'reject' ? 'rejected' : 'revision_requested',
            reviewer_id: user.id,
            review_notes: reviewNotes.trim() || null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', submission.id);

        if (updateError) {
          throw updateError;
        }

        // Log moderation action
        await supabase.from('publication_moderation_logs').insert({
          publication_id: submission.publicationId,
          moderator_id: user.id,
          action_type: reviewAction === 'reject' ? 'post_rejected' : 'submission_reviewed',
          target_type: 'submission',
          target_id: submission.id,
          reason: reviewNotes.trim() || null,
          metadata: { post_id: submission.postId },
        });

        logger.info('Submission reviewed', {
          submissionId: submission.id,
          action: reviewAction,
        });
      }

      setShowReviewDialog(false);
      setReviewAction(null);
      setReviewNotes('');
      onReviewed();
    } catch (err) {
      logger.error('Failed to review submission', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to review submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewDialog = (action: 'approve' | 'reject' | 'revision') => {
    setReviewAction(action);
    setShowReviewDialog(true);
    setError(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{submission.post.title}</CardTitle>
              <CardDescription>
                Submitted by {submission.submitter.displayName || submission.submitter.username}
                {' • '}
                {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
            {getStatusBadge(submission.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission.post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {submission.post.excerpt}
            </p>
          )}

          {submission.submissionNotes && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Submission Notes:</Label>
              <p className="text-sm mt-1">{submission.submissionNotes}</p>
            </div>
          )}

          {submission.reviewNotes && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Review Notes:</Label>
              <p className="text-sm mt-1">{submission.reviewNotes}</p>
              {submission.reviewer && (
                <p className="text-xs text-muted-foreground mt-2">
                  by {submission.reviewer.displayName || submission.reviewer.username}
                  {submission.reviewedAt && (
                    <> • {formatDistanceToNow(new Date(submission.reviewedAt), { addSuffix: true })}</>
                  )}
                </p>
              )}
            </div>
          )}

          {submission.status === 'pending' && (
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => openReviewDialog('approve')}
                variant="default"
                size="sm"
              >
                Approve
              </Button>
              <Button
                onClick={() => openReviewDialog('revision')}
                variant="outline"
                size="sm"
              >
                Request Revision
              </Button>
              <Button
                onClick={() => openReviewDialog('reject')}
                variant="destructive"
                size="sm"
              >
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' && 'Approve Submission'}
              {reviewAction === 'reject' && 'Reject Submission'}
              {reviewAction === 'revision' && 'Request Revision'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' &&
                'This post will be published to your publication.'}
              {reviewAction === 'reject' &&
                'The author will be notified that their submission was not accepted.'}
              {reviewAction === 'revision' &&
                'The author will be asked to make changes and resubmit.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="review-notes">
                {reviewAction === 'approve' ? 'Approval Notes (Optional)' : 'Review Notes'}
              </Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === 'approve'
                    ? 'Add any comments for the author...'
                    : reviewAction === 'reject'
                    ? 'Explain why this submission was rejected...'
                    : 'What changes would you like the author to make?'
                }
                rows={4}
                maxLength={1000}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={isSubmitting}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting
                ? 'Processing...'
                : reviewAction === 'approve'
                ? 'Approve & Publish'
                : reviewAction === 'reject'
                ? 'Reject Submission'
                : 'Request Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
