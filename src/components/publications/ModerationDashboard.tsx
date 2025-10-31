import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';

type ModerationLog = {
  id: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  moderator: {
    username: string;
    displayName: string | null;
  };
};

type PendingSubmission = {
  id: string;
  postId: string;
  status: string;
  submissionNotes: string | null;
  createdAt: string;
  submitter: {
    username: string;
    displayName: string | null;
  };
  post: {
    title: string;
    excerpt: string | null;
  };
};

type ModerationStats = {
  pendingSubmissions: number;
  approvedToday: number;
  rejectedToday: number;
  totalModActions: number;
};

type ModerationDashboardProps = {
  publicationId: string;
};

export function ModerationDashboard({ publicationId }: ModerationDashboardProps) {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pendingSubmissions: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalModActions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadModerationData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load moderation logs
      const { data: logsData, error: logsError } = await supabase
        .from('publication_moderation_logs')
        .select(`
          *,
          moderator:moderator_id (
            username,
            display_name
          )
        `)
        .eq('publication_id', publicationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        throw logsError;
      }

      setLogs(
        (logsData || []).map((item) => ({
          id: item.id,
          actionType: item.action_type,
          targetType: item.target_type,
          targetId: item.target_id,
          reason: item.reason,
          metadata: item.metadata,
          createdAt: item.created_at,
          moderator: {
            username: item.moderator.username,
            displayName: item.moderator.display_name,
          },
        }))
      );

      // Load pending submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('publication_submissions')
        .select(`
          *,
          submitter:submitter_id (
            username,
            display_name
          ),
          post:post_id (
            title,
            excerpt
          )
        `)
        .eq('publication_id', publicationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (submissionsError) {
        throw submissionsError;
      }

      setPendingSubmissions(
        (submissionsData || []).map((item) => ({
          id: item.id,
          postId: item.post_id,
          status: item.status,
          submissionNotes: item.submission_notes,
          createdAt: item.created_at,
          submitter: {
            username: item.submitter.username,
            displayName: item.submitter.display_name,
          },
          post: {
            title: item.post.title,
            excerpt: item.post.excerpt,
          },
        }))
      );

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLogs = logsData?.filter(
        (log: { created_at?: string }) => new Date(log.created_at) >= today
      ) || [];

      setStats({
        pendingSubmissions: submissionsData?.length || 0,
        approvedToday: todayLogs.filter((log: { action_type?: string }) => log.action_type === 'post_approved').length,
        rejectedToday: todayLogs.filter((log: { action_type?: string }) => log.action_type === 'post_rejected').length,
        totalModActions: logsData?.length || 0,
      });
    } catch (err) {
      logger.error('Failed to load moderation data', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [publicationId]);

  useEffect(() => {
    loadModerationData();
  }, [loadModerationData]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'post_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'post_rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'post_removed':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'post_featured':
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    return actionType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading moderation dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground">Awaiting moderation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedToday}</div>
            <p className="text-xs text-muted-foreground">Posts published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedToday}</div>
            <p className="text-xs text-muted-foreground">Submissions declined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModActions}</div>
            <p className="text-xs text-muted-foreground">Moderation history</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({stats.pendingSubmissions})
          </TabsTrigger>
          <TabsTrigger value="logs">Moderation Log</TabsTrigger>
        </TabsList>

        {/* Pending Submissions */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Submissions</CardTitle>
              <CardDescription>Posts awaiting review and approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
                  <p>No pending submissions</p>
                  <p className="text-sm mt-1">All caught up!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{submission.post.title}</p>
                            {submission.post.excerpt && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {submission.post.excerpt}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.submitter.displayName || submission.submitter.username}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(submission.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Open submission review modal
                              logger.info('Review submission', { id: submission.id });
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Log</CardTitle>
              <CardDescription>History of all moderation actions</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No moderation actions yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Moderator</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.actionType)}
                            <Badge variant="outline">{getActionLabel(log.actionType)}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.moderator.displayName || log.moderator.username}
                        </TableCell>
                        <TableCell>
                          {log.targetType && (
                            <Badge variant="secondary">{log.targetType}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {log.reason || '—'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
