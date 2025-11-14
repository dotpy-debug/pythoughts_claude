import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { sendPublicationInvitationEmail } from '../../lib/email-service';

type MemberRole = 'editor' | 'writer' | 'contributor';

type InviteMemberModalProperties = {
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
}: InviteMemberModalProperties) {
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
      // Get current user info for inviter name
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to send invitations');
      }

      // Get inviter profile for name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const inviterName = inviterProfile?.username || 'Someone';

      // Generate invitation token
      const token = crypto.randomUUID();

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('publication_invitations')
        .insert({
          publication_id: publicationId,
          inviter_id: user.id,
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

      // Send invitation email
      const invitationUrl = `${globalThis.location.origin}/publications/invite/${token}`;
      const emailResult = await sendPublicationInvitationEmail(
        email.trim().toLowerCase(),
        {
          inviterName,
          publicationName,
          role,
          invitationUrl,
          personalMessage: message.trim() || undefined,
        }
      );

      if (!emailResult.success) {
        logger.warn('Failed to send invitation email', {
          error: emailResult.error ? new Error(emailResult.error) : undefined,
          invitationId: invitation.id,
        });
        // Don't throw - invitation was created successfully, email is best-effort
      }

      logger.info('Publication invitation created and email sent', {
        invitationId: invitation.id,
        emailSent: emailResult.success,
      });

      // Reset form
      setEmail('');
      setRole('writer');
      setMessage('');

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error_) {
      logger.error('Failed to create invitation', error_ as Error);
      setError(error_ instanceof Error ? error_.message : 'Failed to send invitation');
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
              onValueChange={(value: string) => setRole(value as MemberRole)}
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
