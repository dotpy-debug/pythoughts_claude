import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
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
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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

type PublicationAnalyticsProperties = {
  publicationId: string;
};

type StatCardProperties = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: number;
};

function StatCard({ title, value, icon, description, trend }: StatCardProperties) {
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

export function PublicationAnalytics({ publicationId }: PublicationAnalyticsProperties) {
  const [stats, setStats] = useState<PublicationStats | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load publication stats from materialized view
      const { data: statsData, error: statsError } = await supabase
        .from('publication_stats_summary')
        .select('*')
        .eq('publication_id', publicationId)
        .single();

      if (statsError) {
        logger.error('Error loading publication stats', statsError, {
          publicationId,
        });
        throw statsError;
      }

      setStats(statsData);

      // Load daily analytics for the selected time range
      const days = timeRange === '7d' ? 7 : (timeRange === '30d' ? 30 : 90);
      const startDate = subDays(new Date(), days);

      const { data: analyticsData, error: analyticsError } = await supabase
        .from('publication_analytics')
        .select('*')
        .eq('publication_id', publicationId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (analyticsError) {
        logger.error('Error loading publication analytics', analyticsError, {
          publicationId,
        });
        throw analyticsError;
      }

      setDailyAnalytics(analyticsData || []);

      logger.info('Publication analytics loaded successfully', {
        publicationId,
        dataPoints: analyticsData?.length || 0,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to load publication analytics', error, {
          publicationId,
        });
      } else {
        logger.error('Failed to load publication analytics', new Error('Unknown error'), {
          publicationId,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [publicationId, timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const calculateTotals = () => {
    return dailyAnalytics.reduce(
      (accumulator, day) => ({
        views: accumulator.views + day.total_views,
        reads: accumulator.reads + day.total_reads,
        claps: accumulator.claps + day.total_claps,
        comments: accumulator.comments + day.total_comments,
        bookmarks: accumulator.bookmarks + day.total_bookmarks,
        newSubscribers: accumulator.newSubscribers + day.new_subscribers,
        newsletters: accumulator.newsletters + day.newsletters_sent,
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
        <Tabs value={timeRange} onValueChange={(v: string) => setTimeRange(v as typeof timeRange)}>
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
              description={`Last ${timeRange === '7d' ? '7' : (timeRange === '30d' ? '30' : '90')} days`}
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
              description={`Last ${timeRange === '7d' ? '7' : (timeRange === '30d' ? '30' : '90')} days`}
            />
            <StatCard
              title="Newsletters Sent"
              value={totals.newsletters}
              icon={<Mail className="h-4 w-4" />}
              description="Email campaigns"
            />
          </div>

          {/* Subscriber Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriber Growth</CardTitle>
              <CardDescription>Daily subscriber additions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {dailyAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyAnalytics}>
                      <defs>
                        <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00ff00" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#00ff00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date: Date | undefined) => date ? format(new Date(date), 'MMM d') : ''}
                        stroke="#666"
                      />
                      <YAxis stroke="#666" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00ff00',
                          borderRadius: '4px',
                        }}
                        labelFormatter={(date: Date | undefined) => date ? format(new Date(date), 'MMM d, yyyy') : ''}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="new_subscribers"
                        name="New Subscribers"
                        stroke="#00ff00"
                        fillOpacity={1}
                        fill="url(#colorSubscribers)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Engagement Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>Views, reads, and interactions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {dailyAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date: Date | undefined) => date ? format(new Date(date), 'MMM d') : ''}
                        stroke="#666"
                      />
                      <YAxis stroke="#666" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00ff00',
                          borderRadius: '4px',
                        }}
                        labelFormatter={(date: Date | undefined) => date ? format(new Date(date), 'MMM d, yyyy') : ''}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total_views"
                        name="Views"
                        stroke="#00ff00"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_reads"
                        name="Reads"
                        stroke="#0099ff"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_claps"
                        name="Claps"
                        stroke="#ff00ff"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          {/* Daily Engagement Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Engagement Breakdown</CardTitle>
              <CardDescription>Comments, bookmarks, and newsletters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {dailyAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date: Date | undefined) => date ? format(new Date(date), 'MMM d') : ''}
                        stroke="#666"
                      />
                      <YAxis stroke="#666" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00ff00',
                          borderRadius: '4px',
                        }}
                        labelFormatter={(date: Date | undefined) => date ? format(new Date(date), 'MMM d, yyyy') : ''}
                      />
                      <Legend />
                      <Bar dataKey="total_comments" name="Comments" fill="#00ff00" />
                      <Bar dataKey="total_bookmarks" name="Bookmarks" fill="#0099ff" />
                      <Bar dataKey="newsletters_sent" name="Newsletters" fill="#ff00ff" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>
                Detailed post analytics coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                  <span className="text-sm text-gray-300">Total Content</span>
                  <span className="text-lg font-bold text-terminal-green">
                    {stats.total_posts} posts
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                  <span className="text-sm text-gray-300">Average Views per Post</span>
                  <span className="text-lg font-bold text-terminal-green">
                    {stats.total_posts > 0
                      ? Math.round(stats.total_views / stats.total_posts)
                      : 0}{' '}
                    views
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                  <span className="text-sm text-gray-300">Average Engagement</span>
                  <span className="text-lg font-bold text-terminal-green">
                    {stats.total_posts > 0
                      ? (
                          (stats.total_claps / stats.total_posts) *
                          100
                        ).toFixed(1)
                      : 0}
                    % interaction rate
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Individual post rankings and detailed analytics will be available in a future update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
