/**
 * ChartCard Component
 *
 * Reusable card container for Chart.js charts with terminal theme
 * Features:
 * - Chart.js integration
 * - Consistent styling
 * - Export functionality
 * - Loading states
 * - Terminal-themed design
 */

import { ReactNode } from 'react';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ChartCardProps {
  /**
   * Card title
   */
  title: string;

  /**
   * Card description (optional)
   */
  description?: string;

  /**
   * Chart content
   */
  children: ReactNode;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Primary metric value (optional)
   */
  value?: string | number;

  /**
   * Change percentage (optional)
   */
  change?: number;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Export function (optional)
   */
  onExport?: () => void;

  /**
   * Show export button
   */
  showExport?: boolean;

  /**
   * Chart height in pixels
   */
  height?: number;
}

/**
 * ChartCard Component
 *
 * @example
 * ```tsx
 * <ChartCard
 *   title="Views Over Time"
 *   description="Last 30 days"
 *   value="12,543"
 *   change={15.3}
 *   onExport={() => exportData()}
 * >
 *   <Line data={chartData} options={chartOptions} />
 * </ChartCard>
 * ```
 */
export function ChartCard({
  title,
  description,
  children,
  loading = false,
  value,
  change,
  className,
  onExport,
  showExport = true,
  height = 300,
}: ChartCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus size={16} className="text-gray-500" />;
    }
    if (change > 0) {
      return <TrendingUp size={16} className="text-terminal-green" />;
    }
    return <TrendingDown size={16} className="text-red-500" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) {
      return 'text-gray-500';
    }
    if (change > 0) {
      return 'text-terminal-green';
    }
    return 'text-red-500';
  };

  const formatChange = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div
      className={cn(
        'bg-gray-800 border border-gray-700 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-terminal-green font-mono mb-1">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-400 font-mono">{description}</p>
            )}
          </div>

          {/* Value and Trend */}
          {value !== undefined && (
            <div className="text-right">
              <div className="text-2xl font-bold text-terminal-green font-mono">
                {value}
              </div>
              {change !== undefined && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-mono mt-1',
                    getTrendColor()
                  )}
                >
                  {getTrendIcon()}
                  <span>{formatChange(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Export Button */}
          {showExport && onExport && (
            <button
              onClick={onExport}
              className="ml-4 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-terminal-green transition-colors"
              title="Export data"
            >
              <Download size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-4" style={{ height: `${height}px` }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-terminal-green font-mono animate-pulse">
              Loading chart data...
            </div>
          </div>
        ) : (
          <div className="h-full">{children}</div>
        )}
      </div>
    </div>
  );
}

/**
 * ChartGrid Component
 *
 * Grid layout for multiple chart cards
 */
export interface ChartGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function ChartGrid({
  children,
  columns = 2,
  className,
}: ChartGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-6', gridCols[columns], className)}>
      {children}
    </div>
  );
}

export default ChartCard;
