import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { format, subDays } from 'date-fns';
import {
  BarChart3,
  Eye,
  BookOpen,
  ThumbsUp,
  MessageSquare,
  Bookmark,
  Users,
  Mail,
  TrendingUp,
} from 'lucide-react';

type PublicationStats = {
  publication_id: string;
  name: string;
  slug: string;
  total_members: number;
  total_posts: number;
  total_subscribers: number;
  total_views: number;
  total_reads: number;
  total_claps: number;
  last_published_at: string | null;
};

type DailyAnalytics = {
  date: string;
  total_views: number;
  total_reads: number;
  total_claps: number;
  total_comments: number;
  total_bookmarks: number;
  new_subscribers: number;
  newsletters_sent: number;
};

type PublicationAnalyticsProps = {
  publicationId: string;
};

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: number;
};

function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp
              className={`h-3 w-3 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}
            />
            <span
              className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {trend > 0 ? '+' : ''}
              {trend}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PublicationAnalytics({ publicationId }: PublicationAnalyticsProps) {
  const [stats, setStats] = useState<PublicationStats | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [publicationId, timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Load publication stats from materialized view
      const { data: statsData, error: statsError } = await supabase
        .from('publication_stats_summary')
        .select('*')
        .eq('publication_id', publicationId)
        .single();

      if (statsError) {
        throw statsError;
      }

      setStats(statsData);

      // Load daily analytics for the selected time range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      const { data: analyticsData, error: analyticsError } = await supabase
        .from('publication_analytics')
        .select('*')
        .eq('publication_id', publicationId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (analyticsError) {
        throw analyticsError;
      }

      setDailyAnalytics(analyticsData || []);
    } catch (err) {
      logger.error('Failed to load publication analytics', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    return dailyAnalytics.reduce(
      (acc, day) => ({
        views: acc.views + day.total_views,
        reads: acc.reads + day.total_reads,
        claps: acc.claps + day.total_claps,
        comments: acc.comments + day.total_comments,
        bookmarks: acc.bookmarks + day.total_bookmarks,
        newSubscribers: acc.newSubscribers + day.new_subscribers,
        newsletters: acc.newsletters + day.newsletters_sent,
      }),
      {
        views: 0,
        reads: 0,
        claps: 0,
        comments: 0,
        bookmarks: 0,
        newSubscribers: 0,
        newsletters: 0,
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No analytics data available</div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{stats.name} Analytics</h2>
          <p className="text-muted-foreground">
            Publication performance and insights
          </p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Posts"
          value={stats.total_posts}
          icon={<BarChart3 className="h-4 w-4" />}
          description={
            stats.last_published_at
              ? `Last published ${format(new Date(stats.last_published_at), 'MMM d')}`
              : 'No posts yet'
          }
        />
        <StatCard
          title="Members"
          value={stats.total_members}
          icon={<Users className="h-4 w-4" />}
          description="Active writers and editors"
        />
        <StatCard
          title="Subscribers"
          value={stats.total_subscribers}
          icon={<Mail className="h-4 w-4" />}
          description="Newsletter subscribers"
        />
        <StatCard
          title="Total Views"
          value={stats.total_views}
          icon={<Eye className="h-4 w-4" />}
          description="All-time post views"
        />
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Views"
              value={totals.views}
              icon={<Eye className="h-4 w-4" />}
              description={`Last ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
            />
            <StatCard
              title="Reads"
              value={totals.reads}
              icon={<BookOpen className="h-4 w-4" />}
              description="Completed reads (>50% scroll)"
            />
            <StatCard
              title="Claps"
              value={totals.claps}
              icon={<ThumbsUp className="h-4 w-4" />}
              description="Total appreciation"
            />
            <StatCard
              title="Comments"
              value={totals.comments}
              icon={<MessageSquare className="h-4 w-4" />}
              description="Reader discussions"
            />
            <StatCard
              title="Bookmarks"
              value={totals.bookmarks}
              icon={<Bookmark className="h-4 w-4" />}
              description="Saved for later"
            />
            <StatCard
              title="Engagement Rate"
              value={`${totals.views > 0 ? ((totals.claps + totals.comments + totals.bookmarks) / totals.views * 100).toFixed(1) : 0}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              description="Interactions per view"
            />
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="New Subscribers"
              value={totals.newSubscribers}
              icon={<Users className="h-4 w-4" />}
              description={`Last ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
            />
            <StatCard
              title="Newsletters Sent"
              value={totals.newsletters}
              icon={<Mail className="h-4 w-4" />}
              description="Email campaigns"
            />
          </div>

          {/* Daily growth chart placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriber Growth</CardTitle>
              <CardDescription>Daily subscriber additions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Chart visualization would go here
                {/* TODO: Integrate chart library like recharts */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Top performing posts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-center py-8">
                Top posts list would go here
                {/* TODO: Add top posts query and display */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
