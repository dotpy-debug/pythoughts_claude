import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

type MemberRole = 'editor' | 'writer' | 'contributor';

type InviteMemberModalProps = {
  publicationId: string;
  publicationName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function InviteMemberModal({
  publicationId,
  publicationName,
  isOpen,
  onClose,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('writer');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleDescriptions: Record<MemberRole, string> = {
    editor: 'Can publish posts, edit others\' work, and manage content',
    writer: 'Can write and publish their own posts',
    contributor: 'Can submit posts for review and approval',
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Generate invitation token
      const token = crypto.randomUUID();

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('publication_invitations')
        .insert({
          publication_id: publicationId,
          inviter_id: (await supabase.auth.getUser()).data.user?.id,
          invitee_email: email.trim().toLowerCase(),
          role,
          message: message.trim() || null,
          token,
        })
        .select()
        .single();

      if (inviteError) {
        throw inviteError;
      }

      // TODO: Send invitation email via Resend
      // const invitationUrl = `${window.location.origin}/publications/invite/${token}`;
      // await sendInvitationEmail(email, publicationName, invitationUrl, message);

      logger.info('Publication invitation created', { invitationId: invitation.id });

      // Reset form
      setEmail('');
      setRole('writer');
      setMessage('');

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err) {
      logger.error('Failed to create invitation', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setRole('writer');
      setMessage('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member to {publicationName}</DialogTitle>
          <DialogDescription>
            Send an invitation to collaborate on this publication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="writer@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as MemberRole)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">
                  <div>
                    <div className="font-medium">Editor</div>
                    <div className="text-sm text-muted-foreground">
                      {roleDescriptions.editor}
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="writer">
                  <div>
                    <div className="font-medium">Writer</div>
                    <div className="text-sm text-muted-foreground">
                      {roleDescriptions.writer}
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="contributor">
                  <div>
                    <div className="font-medium">Contributor</div>
                    <div className="text-sm text-muted-foreground">
                      {roleDescriptions.contributor}
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to your invitation..."
              rows={3}
              maxLength={500}
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
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
