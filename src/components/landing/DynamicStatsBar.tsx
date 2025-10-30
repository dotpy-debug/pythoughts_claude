/**
 * DynamicStatsBar Component - Landing Page Statistics
 *
 * Displays real-time platform statistics with:
 * - Total blogs published
 * - Active writers (unique authors)
 * - Total views
 * - Blogs published today
 * - Animated counter effects
 * - Auto-refresh every 5 minutes
 * - Responsive grid layout
 */

import { memo, useEffect, useState } from 'react';
import { BookOpen, Users, Eye, TrendingUp } from 'lucide-react';
import { useLandingStats } from '../../hooks/useLandingStats';

export const DynamicStatsBar = memo(function DynamicStatsBar() {
  const { stats, loading } = useLandingStats();

  if (loading && !stats) {
    return <StatsBarSkeleton />;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      <StatCard
        icon={<BookOpen className="w-6 h-6" />}
        value={stats.totalBlogs}
        label="Blog Posts"
        color="terminal-green"
      />
      <StatCard
        icon={<Users className="w-6 h-6" />}
        value={stats.activeWriters}
        label="Active Writers"
        color="terminal-blue"
      />
      <StatCard
        icon={<Eye className="w-6 h-6" />}
        value={stats.totalViews}
        label="Total Views"
        color="terminal-purple"
        format="abbreviated"
      />
      <StatCard
        icon={<TrendingUp className="w-6 h-6" />}
        value={stats.blogsPublishedToday}
        label="Published Today"
        color="orange-500"
      />
    </div>
  );
});

/**
 * Individual stat card with animated counter
 */
interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  format?: 'number' | 'abbreviated';
}

const StatCard = memo(function StatCard({
  icon,
  value,
  label,
  color,
  format = 'number',
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animated counter effect
  useEffect(() => {
    if (value === 0) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  // Format the displayed value
  const formatValue = (num: number): string => {
    if (format === 'abbreviated') {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className={`flex items-center gap-2 mb-2 text-${color}`}>
        {icon}
      </div>
      <div className="font-mono">
        <div className="text-2xl font-bold text-gray-100 mb-1">
          {formatValue(displayValue)}
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">
          {label}
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton loading state for stats bar
 */
const StatsBarSkeleton = memo(function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
        >
          <div className="w-6 h-6 bg-gray-800 rounded animate-pulse mb-2" />
          <div className="h-8 w-20 bg-gray-800 rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-gray-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
});
