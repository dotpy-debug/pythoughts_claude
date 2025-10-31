/**
 * Analytics Exporter Component
 *
 * Advanced export functionality for analytics data
 * Features:
 * - Multiple export formats (JSON, CSV, PDF)
 * - Scheduled exports
 * - Custom date ranges
 * - Metric selection
 * - Email delivery
 */

import { useState } from 'react';
import { Download, Calendar, Mail, FileText, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, subDays } from 'date-fns';
import { logger } from '../../lib/logger';

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  includeCharts: boolean;
  schedule?: 'daily' | 'weekly' | 'monthly' | null;
  emailTo?: string;
}

export interface AnalyticsExporterProps {
  userId: string;
  onExport: (options: ExportOptions) => Promise<void>;
  className?: string;
}

const AVAILABLE_METRICS = [
  { id: 'views', label: 'Views', description: 'Page views and impressions' },
  { id: 'reads', label: 'Reads', description: 'Content read completion' },
  { id: 'votes', label: 'Votes', description: 'Upvotes and reactions' },
  { id: 'comments', label: 'Comments', description: 'User comments' },
  { id: 'engagement', label: 'Engagement Rate', description: 'Overall engagement metrics' },
  { id: 'traffic', label: 'Traffic Sources', description: 'Referral and source data' },
  { id: 'conversions', label: 'Conversions', description: 'Conversion events' },
];

const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', description: 'Structured data format' },
  { value: 'csv', label: 'CSV', description: 'Spreadsheet compatible' },
  { value: 'pdf', label: 'PDF', description: 'Visual report with charts' },
];

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
];

export function AnalyticsExporter({
  userId: _userId,
  onExport,
  className,
}: AnalyticsExporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
    dateRange: {
      start: subDays(new Date(), 30),
      end: new Date(),
    },
    metrics: ['views', 'reads', 'votes', 'comments'],
    includeCharts: false,
    schedule: null,
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      await onExport(options);
      setIsOpen(false);
    } catch (error) {
      logger.error('Analytics export failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        format: options.format,
        dateRange: {
          start: options.dateRange.start.toISOString(),
          end: options.dateRange.end.toISOString(),
        },
        metrics: options.metrics,
      });
    } finally {
      setExporting(false);
    }
  };

  const setDatePreset = (days: number) => {
    setOptions((prev) => ({
      ...prev,
      dateRange: {
        start: subDays(new Date(), days),
        end: new Date(),
      },
    }));
  };

  const toggleMetric = (metricId: string) => {
    setOptions((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter((m) => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
          'bg-gray-800 border border-gray-700 text-terminal-green',
          'hover:bg-gray-700 hover:border-terminal-green',
          'font-mono transition-all duration-200',
          className
        )}
      >
        <Download size={18} />
        Export Analytics
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-2 border-terminal-green rounded-lg shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download size={24} className="text-terminal-green" />
            <h2 className="text-2xl font-bold text-terminal-green font-mono">
              Export Analytics
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-terminal-green transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-bold text-terminal-green font-mono mb-3">
              <FileText size={16} className="inline mr-2" />
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt.value}
                  onClick={() =>
                    setOptions((prev) => ({
                      ...prev,
                      format: fmt.value as "json" | "csv" | "xlsx" | "pdf",
                    }))
                  }
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all duration-200',
                    'font-mono text-left',
                    options.format === fmt.value
                      ? 'border-terminal-green bg-terminal-green/10 text-terminal-green'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <div className="font-bold mb-1">{fmt.label}</div>
                  <div className="text-xs">{fmt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-bold text-terminal-green font-mono mb-3">
              <Calendar size={16} className="inline mr-2" />
              Date Range
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => setDatePreset(preset.days)}
                  className={cn(
                    'px-3 py-2 rounded-lg font-mono text-sm',
                    'bg-gray-800 border border-gray-700',
                    'hover:border-terminal-green hover:text-terminal-green',
                    'transition-all duration-200'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={format(options.dateRange.start, 'yyyy-MM-dd')}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        start: new Date(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-terminal-green font-mono focus:outline-none focus:border-terminal-green"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={format(options.dateRange.end, 'yyyy-MM-dd')}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        end: new Date(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-terminal-green font-mono focus:outline-none focus:border-terminal-green"
                />
              </div>
            </div>
          </div>

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-bold text-terminal-green font-mono mb-3">
              <Settings size={16} className="inline mr-2" />
              Metrics to Include
            </label>
            <div className="space-y-2">
              {AVAILABLE_METRICS.map((metric) => (
                <label
                  key={metric.id}
                  className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-terminal-green cursor-pointer transition-all duration-200"
                >
                  <input
                    type="checkbox"
                    checked={options.metrics.includes(metric.id)}
                    onChange={() => toggleMetric(metric.id)}
                    className="w-4 h-4 bg-gray-900 border-gray-600 text-terminal-green focus:ring-terminal-green rounded"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-terminal-green font-mono">
                      {metric.label}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {metric.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* PDF Options */}
          {options.format === 'pdf' && (
            <div>
              <label className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeCharts}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      includeCharts: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-bold text-terminal-green font-mono">
                    Include Charts
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Export visual charts in PDF report
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Schedule Options */}
          <div>
            <label className="block text-sm font-bold text-terminal-green font-mono mb-3">
              <Mail size={16} className="inline mr-2" />
              Schedule (Optional)
            </label>
            <select
              value={options.schedule || ''}
              onChange={(e) => {
                const value = e.target.value;
                setOptions((prev) => ({
                  ...prev,
                  schedule: value === '' ? null : (value as 'daily' | 'weekly' | 'monthly'),
                }));
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-terminal-green font-mono focus:outline-none focus:border-terminal-green"
            >
              <option value="">One-time export</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Email Delivery */}
          {options.schedule && (
            <div>
              <label className="block text-xs text-gray-400 font-mono mb-2">
                Email Delivery
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={options.emailTo || ''}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    emailTo: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-terminal-green font-mono placeholder-gray-600 focus:outline-none focus:border-terminal-green"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex items-center justify-end gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-6 py-3 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 font-mono transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || options.metrics.length === 0}
            className={cn(
              'px-6 py-3 rounded-lg font-bold font-mono',
              'bg-terminal-green text-gray-900',
              'hover:bg-terminal-blue transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
            )}
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsExporter;
