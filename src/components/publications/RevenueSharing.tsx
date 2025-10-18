import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { DollarSign, TrendingUp } from 'lucide-react';

type ShareType = 'flat' | 'performance_based' | 'custom';

type RevenueShare = {
  id: string;
  memberId: string;
  sharePercentage: number;
  shareType: ShareType;
  minViews: number;
  minReads: number;
  customFormula: string | null;
  isActive: boolean;
  member: {
    userId: string;
    role: string;
    user: {
      username: string;
      displayName: string | null;
    };
  };
};

type RevenueSharingProps = {
  publicationId: string;
};

export function RevenueSharing({ publicationId }: RevenueSharingProps) {
  const [shares, setShares] = useState<RevenueShare[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; role: string; username: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [selectedMember, setSelectedMember] = useState('');
  const [sharePercentage, setSharePercentage] = useState('0');
  const [shareType, setShareType] = useState<ShareType>('flat');
  const [minViews, setMinViews] = useState('0');
  const [minReads, setMinReads] = useState('0');
  const [customFormula, setCustomFormula] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRevenueShares();
    loadMembers();
  }, [publicationId]);

  const loadRevenueShares = async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('publication_revenue_sharing')
        .select(`
          *,
          member:member_id (
            user_id,
            role,
            user:user_id (
              username,
              display_name
            )
          )
        `)
        .eq('publication_id', publicationId);

      if (fetchError) {
        throw fetchError;
      }

      setShares(
        (data || []).map((item: any) => ({
          id: item.id,
          memberId: item.member_id,
          sharePercentage: item.share_percentage,
          shareType: item.share_type,
          minViews: item.min_views,
          minReads: item.min_reads,
          customFormula: item.custom_formula,
          isActive: item.is_active,
          member: {
            userId: item.member.user_id,
            role: item.member.role,
            user: {
              username: item.member.user.username,
              displayName: item.member.user.display_name,
            },
          },
        }))
      );
    } catch (err) {
      logger.error('Failed to load revenue shares', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('publication_members')
        .select(`
          id,
          role,
          user:user_id (
            username
          )
        `)
        .eq('publication_id', publicationId);

      if (fetchError) {
        throw fetchError;
      }

      setMembers(
        (data || []).map((item: any) => ({
          id: item.id,
          role: item.role,
          username: item.user.username,
        }))
      );
    } catch (err) {
      logger.error('Failed to load members', err as Error);
    }
  };

  const handleAddShare = async () => {
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }

    const percentage = parseFloat(sharePercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      setError('Share percentage must be between 0 and 100');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('publication_revenue_sharing').insert({
        publication_id: publicationId,
        member_id: selectedMember,
        share_percentage: percentage,
        share_type: shareType,
        min_views: parseInt(minViews) || 0,
        min_reads: parseInt(minReads) || 0,
        custom_formula: shareType === 'custom' ? customFormula.trim() || null : null,
        is_active: isActive,
      });

      if (insertError) {
        throw insertError;
      }

      logger.info('Revenue share added');

      // Reset form
      setSelectedMember('');
      setSharePercentage('0');
      setShareType('flat');
      setMinViews('0');
      setMinReads('0');
      setCustomFormula('');
      setIsActive(true);
      setShowAddForm(false);

      // Reload shares
      loadRevenueShares();
    } catch (err) {
      logger.error('Failed to add revenue share', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to add revenue share');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (shareId: string, currentStatus: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('publication_revenue_sharing')
        .update({ is_active: !currentStatus })
        .eq('id', shareId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setShares((prev) =>
        prev.map((share) =>
          share.id === shareId ? { ...share, isActive: !currentStatus } : share
        )
      );
    } catch (err) {
      logger.error('Failed to toggle revenue share status', err as Error);
    }
  };

  const handleDelete = async (shareId: string) => {
    if (!confirm('Are you sure you want to delete this revenue share configuration?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('publication_revenue_sharing')
        .delete()
        .eq('id', shareId);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setShares((prev) => prev.filter((share) => share.id !== shareId));
    } catch (err) {
      logger.error('Failed to delete revenue share', err as Error);
    }
  };

  const getTotalAllocation = () => {
    return shares
      .filter((share) => share.isActive)
      .reduce((sum, share) => sum + share.sharePercentage, 0);
  };

  const availableMembers = members.filter(
    (member) => !shares.some((share) => share.memberId === member.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading revenue sharing...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Revenue Sharing</CardTitle>
              <CardDescription>
                Configure how publication revenue is distributed among members
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
              {showAddForm ? 'Cancel' : 'Add Share'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Allocated</p>
                <p className="text-2xl font-bold">{getTotalAllocation().toFixed(1)}%</p>
              </div>
            </div>
            {getTotalAllocation() > 100 && (
              <Badge variant="destructive">
                Over-allocated by {(getTotalAllocation() - 100).toFixed(1)}%
              </Badge>
            )}
            {getTotalAllocation() < 100 && (
              <Badge variant="secondary">
                {(100 - getTotalAllocation()).toFixed(1)}% unallocated
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Revenue Share</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member">Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember} disabled={isSaving}>
                <SelectTrigger id="member">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.username} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentage">Share Percentage *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="percentage"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={sharePercentage}
                  onChange={(e) => setSharePercentage(e.target.value)}
                  disabled={isSaving}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Share Type</Label>
              <Select
                value={shareType}
                onValueChange={(value) => setShareType(value as ShareType)}
                disabled={isSaving}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat - Fixed percentage</SelectItem>
                  <SelectItem value="performance_based">
                    Performance-Based - Based on metrics
                  </SelectItem>
                  <SelectItem value="custom">Custom - Custom formula</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareType === 'performance_based' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minViews">Minimum Views</Label>
                  <Input
                    id="minViews"
                    type="number"
                    min={0}
                    value={minViews}
                    onChange={(e) => setMinViews(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minReads">Minimum Reads</Label>
                  <Input
                    id="minReads"
                    type="number"
                    min={0}
                    value={minReads}
                    onChange={(e) => setMinReads(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}

            {shareType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="formula">Custom Formula</Label>
                <Input
                  id="formula"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  placeholder="e.g., views * 0.001 + reads * 0.002"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: views, reads, claps, comments
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={isSaving} />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <Button onClick={handleAddShare} disabled={isSaving} className="w-full">
              {isSaving ? 'Adding...' : 'Add Revenue Share'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revenue Shares Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Revenue Shares</CardTitle>
        </CardHeader>
        <CardContent>
          {shares.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No revenue shares configured yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((share) => (
                  <TableRow key={share.id}>
                    <TableCell className="font-medium">
                      {share.member.user.displayName || share.member.user.username}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{share.member.role}</Badge>
                    </TableCell>
                    <TableCell>{share.sharePercentage}%</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {share.shareType === 'flat' && 'Flat'}
                        {share.shareType === 'performance_based' && (
                          <>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Performance
                          </>
                        )}
                        {share.shareType === 'custom' && 'Custom'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={share.isActive}
                        onCheckedChange={() => handleToggleActive(share.id, share.isActive)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(share.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
