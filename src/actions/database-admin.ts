/**
 * Database Admin Server Actions
 *
 * Server actions for database browsing and management:
 * - Table listing
 * - Data browsing with pagination
 * - Record editing
 * - Schema inspection
 * - Safe query execution
 */

import { supabase } from '../lib/supabase';
import { requireRole, logAdminActivity, ADMIN_ROLES } from '../lib/admin-auth';
import { logger } from '../lib/logger';

/**
 * Get list of all tables in the database
 */
export async function getDatabaseTables(params: {
  currentUserId: string;
}): Promise<{ tables: DatabaseTable[]; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    // Query information_schema for tables
    const { data, error } = await supabase.rpc('get_table_list');

    if (error) {
      // Fallback: list known tables
      const knownTables = [
        'profiles',
        'posts',
        'comments',
        'votes',
        'reactions',
        'tasks',
        'notifications',
        'post_drafts',
        'claps',
        'highlights',
        'series',
        'publications',
        'tags',
        'categories',
        'bookmarks',
        'reading_lists',
        'admin_roles',
        'admin_activity_logs',
        'user_suspensions',
        'system_settings',
        'content_reports',
      ];

      const tables: DatabaseTable[] = [];
      for (const tableName of knownTables) {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        tables.push({
          table_name: tableName,
          row_count: count ?? 0,
        });
      }

      return { tables };
    }

    return { tables: data as DatabaseTable[] };
  } catch (error) {
    logger.error('Exception in getDatabaseTables', { error });
    return {
      tables: [],
      error: error instanceof Error ? error.message : 'Failed to fetch tables',
    };
  }
}

/**
 * Get table schema information
 */
export async function getTableSchema(params: {
  currentUserId: string;
  tableName: string;
}): Promise<{ columns: TableColumn[]; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    // This would ideally query information_schema.columns
    // For now, we'll return a simple structure
    const columns: TableColumn[] = [];

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'view_table_schema',
      targetType: 'table',
      details: { tableName: params.tableName },
    });

    return { columns };
  } catch (error) {
    logger.error('Exception in getTableSchema', { error });
    return {
      columns: [],
      error: error instanceof Error ? error.message : 'Failed to fetch schema',
    };
  }
}

/**
 * Browse table data with pagination
 */
export async function browseTableData(params: {
  currentUserId: string;
  tableName: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}): Promise<{ data: any[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from(params.tableName)
      .select('*', { count: 'exact' });

    if (params.orderBy) {
      query = query.order(params.orderBy, {
        ascending: params.orderDirection === 'asc',
      });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error browsing table data', { error, tableName: params.tableName });
      return { data: [], total: 0, error: 'Failed to browse table data' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'browse_table_data',
      targetType: 'table',
      details: { tableName: params.tableName, page, limit },
    });

    return {
      data: data ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in browseTableData', { error });
    return {
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to browse table data',
    };
  }
}

/**
 * Search table data
 */
export async function searchTableData(params: {
  currentUserId: string;
  tableName: string;
  searchColumn: string;
  searchValue: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from(params.tableName)
      .select('*', { count: 'exact' });

    // Use ilike for case-insensitive search
    query = query.ilike(params.searchColumn, `%${params.searchValue}%`);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error searching table data', { error });
      return { data: [], total: 0, error: 'Failed to search table data' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'search_table_data',
      targetType: 'table',
      details: {
        tableName: params.tableName,
        searchColumn: params.searchColumn,
        searchValue: params.searchValue,
      },
    });

    return {
      data: data ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in searchTableData', { error });
    return {
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to search table data',
    };
  }
}

/**
 * Update a record in a table
 */
export async function updateTableRecord(params: {
  currentUserId: string;
  tableName: string;
  recordId: string;
  updates: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    // Add updated_at if the table has it
    const updatesWithTimestamp = {
      ...params.updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(params.tableName)
      .update(updatesWithTimestamp)
      .eq('id', params.recordId);

    if (error) {
      logger.error('Error updating table record', { error });
      return { success: false, error: 'Failed to update record' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_table_record',
      targetType: 'table',
      targetId: params.recordId,
      details: {
        tableName: params.tableName,
        updates: params.updates,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateTableRecord', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update record',
    };
  }
}

/**
 * Delete a record from a table
 */
export async function deleteTableRecord(params: {
  currentUserId: string;
  tableName: string;
  recordId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { error } = await supabase
      .from(params.tableName)
      .delete()
      .eq('id', params.recordId);

    if (error) {
      logger.error('Error deleting table record', { error });
      return { success: false, error: 'Failed to delete record' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'delete_table_record',
      targetType: 'table',
      targetId: params.recordId,
      details: { tableName: params.tableName },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deleteTableRecord', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete record',
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(params: {
  currentUserId: string;
}): Promise<{ stats: DatabaseStats; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    // Get counts for major tables
    const tables = [
      'profiles',
      'posts',
      'comments',
      'votes',
      'tasks',
      'notifications',
      'admin_activity_logs',
    ];

    const stats: DatabaseStats = {
      totalTables: 0,
      totalRecords: 0,
      tableSizes: {},
    };

    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      stats.tableSizes[table] = count ?? 0;
      stats.totalRecords += count ?? 0;
    }

    stats.totalTables = tables.length;

    return { stats };
  } catch (error) {
    logger.error('Exception in getDatabaseStats', { error });
    return {
      stats: { totalTables: 0, totalRecords: 0, tableSizes: {} },
      error: error instanceof Error ? error.message : 'Failed to get database stats',
    };
  }
}

// Types
interface DatabaseTable {
  table_name: string;
  row_count: number;
}

interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface DatabaseStats {
  totalTables: number;
  totalRecords: number;
  tableSizes: Record<string, number>;
}
