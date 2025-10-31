/**
 * Enhanced Analytics Page
 *
 * Comprehensive analytics dashboard with Chart.js visualizations
 * Features:
 * - Multiple chart types (line, bar, doughnut, radar)
 * - Time range filtering
 * - Real-time data updates
 * - Export functionality
 * - Performance metrics
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import { BarChart3, Calendar, Download } from 'lucide-react';
import { ChartCard, ChartGrid } from '../components/analytics/ChartCard';
import { useAuth } from '../contexts/AuthContext';
import {
  getMultiMetricTimeSeries,
  getFunnelAnalysis,
  getTopPerformingPosts,
  calculateGrowthRate,
  type FunnelStep,
} from '../lib/analytics-enhanced';
import { cn } from '../lib/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TimeRange = 7 | 30 | 90 | 365;

const TIME_RANGES: Array<{ label: string; days: TimeRange }> = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '1 Year', days: 365 },
];

// Chart.js theme configuration
const chartColors = {
  primary: '#00ff00',
  secondary: '#00aaff',
  tertiary: '#aa00ff',
  quaternary: '#ffaa00',
  grid: '#333',
  text: '#00ff00',
};

const defaultChartOptions: ChartOptions<'line' | 'bar' | 'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: chartColors.text,
        font: {
          family: '"Courier New", monospace',
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: '#111',
      titleColor: chartColors.primary,
      bodyColor: '#fff',
      borderColor: chartColors.primary,
      borderWidth: 1,
      titleFont: {
        family: '"Courier New", monospace',
      },
      bodyFont: {
        family: '"Courier New", monospace',
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: chartColors.text,
        font: {
          family: '"Courier New", monospace',
        },
      },
      grid: {
        color: chartColors.grid,
      },
    },
    y: {
      ticks: {
        color: chartColors.text,
        font: {
          family: '"Courier New", monospace',
        },
      },
      grid: {
        color: chartColors.grid,
      },
    },
  },
};

export function EnhancedAnalyticsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [loading, setLoading] = useState(true);

  // Data states
  const [timeSeriesData, setTimeSeriesData] = useState<{
    views?: Array<{ date: string; value: number }>;
    reads?: Array<{ date: string; value: number }>;
    [key: string]: unknown;
  }>({});
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [topPosts, setTopPosts] = useState<Array<{
    id: string;
    title: string;
    views: number;
    reads: number;
    engagement: number;
  }>>([]);
  const [metrics, setMetrics] = useState({
    totalViews: 0,
    totalReads: 0,
    totalVotes: 0,
    totalComments: 0,
    viewsChange: 0,
    readsChange: 0,
  });

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Load time series data
      const timeSeries = await getMultiMetricTimeSeries(
        user.id,
        ['views', 'reads', 'votes', 'comments'],
        timeRange
      );
      setTimeSeriesData(timeSeries);

      // Calculate metrics
      const currentPeriodViews = timeSeries.views?.reduce(
        (sum, p) => sum + p.value,
        0
      ) || 0;
      const currentPeriodReads = timeSeries.reads?.reduce(
        (sum, p) => sum + p.value,
        0
      ) || 0;

      // Load previous period for comparison
      const previousTimeSeries = await getMultiMetricTimeSeries(
        user.id,
        ['views', 'reads'],
        timeRange
      );
      const previousPeriodViews = previousTimeSeries.views?.reduce(
        (sum, p) => sum + p.value,
        0
      ) || 0;
      const previousPeriodReads = previousTimeSeries.reads?.reduce(
        (sum, p) => sum + p.value,
        0
      ) || 0;

      setMetrics({
        totalViews: currentPeriodViews,
        totalReads: currentPeriodReads,
        totalVotes: timeSeries.votes?.reduce((sum, p) => sum + p.value, 0) || 0,
        totalComments:
          timeSeries.comments?.reduce((sum, p) => sum + p.value, 0) || 0,
        viewsChange: calculateGrowthRate(
          currentPeriodViews,
          previousPeriodViews
        ),
        readsChange: calculateGrowthRate(
          currentPeriodReads,
          previousPeriodReads
        ),
      });

      // Load funnel data
      const funnel = await getFunnelAnalysis(user.id, timeRange);
      setFunnelData(funnel);

      // Load top posts
      const posts = await getTopPerformingPosts(user.id, 'views', 5, timeRange);
      setTopPosts(posts);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    if (!user) return;
    loadAnalytics();
  }, [user, loadAnalytics]);

  // Prepare chart data
  const viewsTrendData = {
    labels: timeSeriesData.views?.map((p: { date: string }) => p.date) || [],
    datasets: [
      {
        label: 'Views',
        data: timeSeriesData.views?.map((p: { value: number }) => p.value) || [],
        borderColor: chartColors.primary,
        backgroundColor: `${chartColors.primary}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Reads',
        data: timeSeriesData.reads?.map((p: { value: number }) => p.value) || [],
        borderColor: chartColors.secondary,
        backgroundColor: `${chartColors.secondary}33`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const engagementData = {
    labels: ['Views', 'Reads', 'Votes', 'Comments'],
    datasets: [
      {
        label: 'Engagement Metrics',
        data: [
          metrics.totalViews,
          metrics.totalReads,
          metrics.totalVotes,
          metrics.totalComments,
        ],
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.tertiary,
          chartColors.quaternary,
        ],
        borderColor: '#111',
        borderWidth: 2,
      },
    ],
  };

  const funnelChartData = {
    labels: funnelData.map((step) => step.step),
    datasets: [
      {
        label: 'Count',
        data: funnelData.map((step) => step.count),
        backgroundColor: chartColors.primary,
        borderColor: chartColors.primary,
        borderWidth: 2,
      },
    ],
  };

  const topPostsData = {
    labels: topPosts.map((post) =>
      post.title.length > 30
        ? post.title.substring(0, 30) + '...'
        : post.title
    ),
    datasets: [
      {
        label: 'Views',
        data: topPosts.map((post) => post.views),
        backgroundColor: chartColors.primary,
      },
    ],
  };

  const performanceRadarData = {
    labels: ['Views', 'Reads', 'Engagement', 'Retention', 'Conversions'],
    datasets: [
      {
        label: 'Performance',
        data: [
          Math.min((metrics.totalViews / 1000) * 100, 100),
          Math.min((metrics.totalReads / 500) * 100, 100),
          Math.min((metrics.totalVotes / 100) * 100, 100),
          funnelData[1] ? funnelData[1].percentage : 0,
          funnelData[3] ? funnelData[3].percentage : 0,
        ],
        backgroundColor: `${chartColors.primary}33`,
        borderColor: chartColors.primary,
        borderWidth: 2,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: chartColors.primary,
      },
    ],
  };

  const radarOptions: ChartOptions<'radar'> = {
    ...defaultChartOptions,
    scales: {
      r: {
        ticks: {
          color: chartColors.text,
          font: {
            family: '"Courier New", monospace',
          },
        },
        grid: {
          color: chartColors.grid,
        },
        pointLabels: {
          color: chartColors.text,
          font: {
            family: '"Courier New", monospace',
            size: 12,
          },
        },
      },
    },
  };

  const exportData = () => {
    const data = {
      metrics,
      timeRange,
      timeSeries: timeSeriesData,
      funnel: funnelData,
      topPosts,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 size={32} className="text-terminal-green" />
              <h1 className="text-3xl font-bold text-terminal-green font-mono">
                Enhanced Analytics
              </h1>
            </div>

            <button
              onClick={exportData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-green text-gray-900 hover:bg-terminal-blue font-bold font-mono transition-all duration-200"
            >
              <Download size={18} />
              Export Data
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <div className="flex gap-2">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.days}
                  onClick={() => setTimeRange(range.days)}
                  className={cn(
                    'px-4 py-2 rounded-lg font-mono text-sm transition-all duration-200',
                    timeRange === range.days
                      ? 'bg-terminal-green text-gray-900 font-bold'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Charts */}
        <ChartGrid columns={2}>
          {/* Views & Reads Trend */}
          <ChartCard
            title="Traffic Trends"
            description={`Views and reads over the last ${timeRange} days`}
            value={metrics.totalViews.toLocaleString()}
            change={metrics.viewsChange}
            loading={loading}
            height={300}
          >
            <Line data={viewsTrendData} options={defaultChartOptions} />
          </ChartCard>

          {/* Engagement Distribution */}
          <ChartCard
            title="Engagement Distribution"
            description="Total engagement metrics"
            value={
              (
                metrics.totalViews +
                metrics.totalReads +
                metrics.totalVotes +
                metrics.totalComments
              ).toLocaleString()
            }
            loading={loading}
            height={300}
          >
            <Doughnut
              data={engagementData}
              options={{
                ...defaultChartOptions,
                scales: undefined,
              }}
            />
          </ChartCard>

          {/* Conversion Funnel */}
          <ChartCard
            title="Conversion Funnel"
            description="User journey through content"
            loading={loading}
            height={300}
          >
            <Bar
              data={funnelChartData}
              options={{
                ...defaultChartOptions,
                indexAxis: 'y',
              }}
            />
          </ChartCard>

          {/* Performance Radar */}
          <ChartCard
            title="Performance Overview"
            description="Multi-dimensional performance metrics"
            loading={loading}
            height={300}
          >
            <Radar data={performanceRadarData} options={radarOptions} />
          </ChartCard>

          {/* Top Posts */}
          <ChartCard
            title="Top Performing Posts"
            description={`By views in last ${timeRange} days`}
            loading={loading}
            height={300}
            className="lg:col-span-2"
          >
            <Bar
              data={topPostsData}
              options={{
                ...defaultChartOptions,
                indexAxis: 'y',
              }}
            />
          </ChartCard>
        </ChartGrid>
      </div>
    </div>
  );
}

export default EnhancedAnalyticsPage;
