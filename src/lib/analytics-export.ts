import { supabase } from './supabase';
import { logger } from './logger';

export type AnalyticsExportFormat = 'csv' | 'json' | 'xlsx';

export type DateRange = {
  start: Date;
  end: Date;
};

/**
 * Analytics export system
 * Export analytics data in various formats for external analysis
 */
export class AnalyticsExporter {
  /**
   * Export post analytics for an author
   */
  static async exportPostAnalytics(
    authorId: string,
    dateRange: DateRange,
    format: AnalyticsExportFormat = 'csv'
  ): Promise<Blob> {
    try {
      // Query post analytics
      const { data, error } = await supabase
        .from('post_analytics')
        .select(`
          *,
          posts:post_id (
            id,
            title,
            category,
            created_at,
            published_at
          )
        `)
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0])
        .eq('posts.author_id', authorId)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      switch (format) {
        case 'csv':
          return this.exportToCSV(data || []);
        case 'json':
          return this.exportToJSON(data || []);
        case 'xlsx':
          return this.exportToXLSX(data || []);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export post analytics', error as Error);
      throw error;
    }
  }

  /**
   * Export referral data
   */
  static async exportReferralData(
    postId: string,
    dateRange: DateRange,
    format: AnalyticsExportFormat = 'csv'
  ): Promise<Blob> {
    try {
      const { data, error } = await supabase
        .from('referral_tracking')
        .select('*')
        .eq('post_id', postId)
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0])
        .order('visits', { ascending: false });

      if (error) {
        throw error;
      }

      switch (format) {
        case 'csv':
          return this.exportToCSV(data || []);
        case 'json':
          return this.exportToJSON(data || []);
        case 'xlsx':
          return this.exportToXLSX(data || []);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export referral data', error as Error);
      throw error;
    }
  }

  /**
   * Export custom events
   */
  static async exportEvents(
    userId: string,
    dateRange: DateRange,
    eventName?: string,
    format: AnalyticsExportFormat = 'csv'
  ): Promise<Blob> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (eventName) {
        query = query.eq('event_name', eventName);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      switch (format) {
        case 'csv':
          return this.exportToCSV(data || []);
        case 'json':
          return this.exportToJSON(data || []);
        case 'xlsx':
          return this.exportToXLSX(data || []);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export events', error as Error);
      throw error;
    }
  }

  /**
   * Export author summary statistics
   */
  static async exportAuthorSummary(authorId: string): Promise<Blob> {
    try {
      const { data, error } = await supabase
        .from('author_analytics_summary')
        .select('*')
        .eq('author_id', authorId)
        .single();

      if (error) {
        throw error;
      }

      return this.exportToJSON(data || {});
    } catch (error) {
      logger.error('Failed to export author summary', error as Error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  private static exportToCSV(data: unknown[]): Blob {
    if (!Array.isArray(data) || data.length === 0) {
      return new Blob(['No data available'], { type: 'text/csv' });
    }

    // Get headers from first object
    const headers = Object.keys(data[0] as Record<string, unknown>);

    // Create CSV content
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => {
        return headers.map(header => {
          const value = (row as Record<string, unknown>)[header];
          // Handle nested objects and arrays
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          // Escape quotes in strings
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      }),
    ];

    const csvContent = csvRows.join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Convert data to JSON format
   */
  private static exportToJSON(data: unknown): Blob {
    const jsonContent = JSON.stringify(data, null, 2);
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  }

  /**
   * Convert data to XLSX format (basic implementation)
   * Note: For production, use a library like xlsx or exceljs
   */
  private static exportToXLSX(data: unknown[]): Blob {
    // For now, export as CSV with xlsx extension
    // In production, implement proper XLSX generation
    const csv = this.exportToCSV(data);
    return new Blob([csv], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * Trigger download of exported data
   */
  static downloadExport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for export
   */
  static generateFilename(
    type: string,
    format: AnalyticsExportFormat,
    dateRange?: DateRange
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const rangeStr = dateRange
      ? `_${dateRange.start.toISOString().split('T')[0]}_to_${dateRange.end.toISOString().split('T')[0]}`
      : '';

    return `${type}_analytics${rangeStr}_${timestamp}.${format}`;
  }
}

/**
 * Convenience functions for common export scenarios
 */
export async function exportMyPostAnalytics(
  userId: string,
  days: number = 30,
  format: AnalyticsExportFormat = 'csv'
): Promise<void> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const blob = await AnalyticsExporter.exportPostAnalytics(userId, { start, end }, format);
  const filename = AnalyticsExporter.generateFilename('post', format, { start, end });
  AnalyticsExporter.downloadExport(blob, filename);
}

export async function exportMyEvents(
  userId: string,
  days: number = 30,
  format: AnalyticsExportFormat = 'csv'
): Promise<void> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const blob = await AnalyticsExporter.exportEvents(userId, { start, end }, undefined, format);
  const filename = AnalyticsExporter.generateFilename('events', format, { start, end });
  AnalyticsExporter.downloadExport(blob, filename);
}

export default AnalyticsExporter;
