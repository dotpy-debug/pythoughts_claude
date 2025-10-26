/**
 * Publication Invitation Accept Page
 *
 * Handles invitation acceptance flow via email token
 * Features:
 * - Token validation
 * - Invitation details display
 * - Accept/decline actions
 * - Automatic member creation on acceptance
 * - Expired invitation handling
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, Clock, Mail, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';

interface InvitationData {
  id: string;
  publication_id: string;
  inviter_id: string;
  invitee_email: string;
  role: 'editor' | 'writer' | 'contributor';
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  publication: {
    id: string;
    name: string;
    tagline: string | null;
    logo_url: string | null;
  };
  inviter: {
    username: string;
    avatar_url: string | null;
  };
}

export function PublicationInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('publication_invitations')
        .select(`
          *,
          publication:publications!publication_id (
            id,
            name,
            tagline,
            logo_url
          ),
          inviter:profiles!inviter_id (
            username,
            avatar_url
          )
        `)
        .eq('token', token)
        .single();

      if (fetchError || !data) {
        throw new Error('Invitation not found');
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        data.status = 'expired';
      }

      setInvitation(data as unknown as InvitationData);
      logger.info('Invitation loaded', { invitationId: data.id });
    } catch (err) {
      logger.error(
        'Failed to load invitation',
        err instanceof Error ? err : new Error(String(err)),
        { token }
      );
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation || !user) {
      setError('You must be logged in to accept this invitation');
      return;
    }

    // Verify email matches if user is logged in
    if (user.email && user.email.toLowerCase() !== invitation.invitee_email.toLowerCase()) {
      setError(
        `This invitation was sent to ${invitation.invitee_email}. Please log in with that email to accept.`
      );
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('publication_members')
        .select('id')
        .eq('publication_id', invitation.publication_id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        setError('You are already a member of this publication');
        return;
      }

      // Set appropriate permissions based on role
      const permissions = {
        editor: {
          can_publish: true,
          can_edit_others: true,
          can_delete_posts: true,
          can_manage_members: false,
          can_manage_settings: false,
        },
        writer: {
          can_publish: true,
          can_edit_others: false,
          can_delete_posts: false,
          can_manage_members: false,
          can_manage_settings: false,
        },
        contributor: {
          can_publish: false,
          can_edit_others: false,
          can_delete_posts: false,
          can_manage_members: false,
          can_manage_settings: false,
        },
      };

      // Add user as member
      const { error: memberError } = await supabase
        .from('publication_members')
        .insert({
          publication_id: invitation.publication_id,
          user_id: user.id,
          role: invitation.role,
          ...permissions[invitation.role],
        });

      if (memberError) {
        throw memberError;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('publication_invitations')
        .update({
          status: 'accepted',
          invitee_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) {
        logger.warn('Failed to update invitation status', {
          errorMessage: updateError.message,
        });
      }

      // Increment member count on publication
      const { error: countError } = await supabase.rpc('increment', {
        row_id: invitation.publication_id,
        table_name: 'publications',
        column_name: 'member_count',
      });

      if (countError) {
        logger.warn('Failed to update member count', {
          errorMessage: countError.message,
        });
      }

      logger.info('Invitation accepted successfully', {
        invitationId: invitation.id,
        userId: user.id,
        publicationId: invitation.publication_id,
      });

      // Navigate to publication homepage
      navigate(`/publications/${invitation.publication.id}`);
    } catch (err) {
      logger.error(
        'Failed to accept invitation',
        err instanceof Error ? err : new Error(String(err))
      );
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    try {
      setProcessing(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('publication_invitations')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) {
        throw updateError;
      }

      logger.info('Invitation declined', { invitationId: invitation.id });

      // Navigate to home
      navigate('/');
    } catch (err) {
      logger.error(
        'Failed to decline invitation',
        err instanceof Error ? err : new Error(String(err))
      );
      setError(err instanceof Error ? err.message : 'Failed to decline invitation');
    } finally {
      setProcessing(false);
    }
  };

  const roleDescriptions = {
    editor: 'Can publish posts, edit others\' work, and manage content',
    writer: 'Can write and publish their own posts',
    contributor: 'Can submit posts for review and approval',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-terminal-green p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4">Loading invitation...</div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-black text-terminal-green p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const isExpired = invitation.status === 'expired';
  const isAccepted = invitation.status === 'accepted';
  const isDeclined = invitation.status === 'declined';

  return (
    <div className="min-h-screen bg-black text-terminal-green p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-terminal-black border-2 border-terminal-green rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            {invitation.publication.logo_url ? (
              <img
                src={invitation.publication.logo_url}
                alt={invitation.publication.name}
                className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 mx-auto mb-4 rounded-lg bg-terminal-green/10 flex items-center justify-center">
                <Users className="w-12 h-12" />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2">You've Been Invited!</h1>
            <p className="text-terminal-green/70">
              <strong>{invitation.inviter.username}</strong> invited you to join
            </p>
          </div>

          {/* Publication Info */}
          <div className="bg-black border border-terminal-green/30 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-2">{invitation.publication.name}</h2>
            {invitation.publication.tagline && (
              <p className="text-terminal-green/70 mb-4">{invitation.publication.tagline}</p>
            )}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-terminal-green text-black font-bold rounded">
                {invitation.role.toUpperCase()}
              </span>
              <span className="text-sm text-terminal-green/70">
                {roleDescriptions[invitation.role]}
              </span>
            </div>
            {invitation.message && (
              <div className="border-l-2 border-terminal-green/30 pl-4 py-2 mb-4">
                <p className="text-sm text-terminal-green/80 italic">
                  &quot;{invitation.message}&quot;
                </p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {isExpired && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-500 mb-1">Invitation Expired</h3>
                <p className="text-sm text-yellow-400">
                  This invitation expired on {new Date(invitation.expires_at).toLocaleDateString()}.
                  Please ask {invitation.inviter.username} to send a new invitation.
                </p>
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-green-500 mb-1">Already Accepted</h3>
                <p className="text-sm text-green-400">
                  You've already accepted this invitation and are now a member of{' '}
                  {invitation.publication.name}.
                </p>
              </div>
            </div>
          )}

          {isDeclined && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-500 mb-1">Invitation Declined</h3>
                <p className="text-sm text-red-400">
                  You declined this invitation. If you've changed your mind, please ask{' '}
                  {invitation.inviter.username} to send a new invitation.
                </p>
              </div>
            </div>
          )}

          {!user && !isExpired && !isAccepted && !isDeclined && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-500 mb-1">Login Required</h3>
                <p className="text-sm text-blue-400">
                  Please log in with the email address <strong>{invitation.invitee_email}</strong>{' '}
                  to accept this invitation.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            {!isExpired && !isAccepted && !isDeclined && (
              <>
                {user ? (
                  <>
                    <Button
                      onClick={handleAccept}
                      disabled={processing}
                      className="bg-terminal-green text-black hover:bg-terminal-green/80"
                    >
                      {processing ? 'Accepting...' : 'Accept Invitation'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDecline}
                      disabled={processing}
                    >
                      {processing ? 'Declining...' : 'Decline'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => navigate(`/login?redirect=/publications/invite/${token}`)}
                    className="bg-terminal-green text-black hover:bg-terminal-green/80"
                  >
                    Log In to Accept
                  </Button>
                )}
              </>
            )}
            {(isExpired || isAccepted || isDeclined) && (
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
