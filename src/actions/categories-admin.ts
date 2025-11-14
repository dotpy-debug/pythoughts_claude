/**
 * Categories and Tags Admin Server Actions
 *
 * Server actions for managing categories and tags:
 * - Category CRUD operations
 * - Tag management with merge/rename
 * - Tag cleanup and optimization
 * - Featured tags management
 */

import { supabase, type Category, type Tag } from '../lib/supabase';
import { requireRole, logAdminActivity, ADMIN_ROLES } from '../lib/admin-auth';
import { logger } from '../lib/logger';
import type { FeaturedTagsSetting } from '../types/common';

/**
 * Get all categories with statistics
 */
export async function getCategories(parameters: {
  currentUserId: string;
  includeInactive?: boolean;
}): Promise<{ categories: Category[]; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    let query = supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!parameters.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching categories', { errorDetails: error });
      return { categories: [], error: 'Failed to fetch categories' };
    }

    return { categories: (data as Category[]) ?? [] };
  } catch (error) {
    logger.error('Exception in getCategories', { errorDetails: error });
    return {
      categories: [],
      error: error instanceof Error ? error.message : 'Failed to fetch categories',
    };
  }
}

/**
 * Create a new category
 */
export async function createCategory(parameters: {
  currentUserId: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
}): Promise<{ category: Category | null; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: parameters.name,
        slug: parameters.slug,
        description: parameters.description,
        color: parameters.color,
        icon: parameters.icon,
        is_active: true,
        display_order: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating category', { errorDetails: error });
      return { category: null, error: 'Failed to create category' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'create_category',
      targetType: 'category',
      targetId: data.id,
      details: { name: parameters.name, slug: parameters.slug },
    });

    return { category: data as Category };
  } catch (error) {
    logger.error('Exception in createCategory', { errorDetails: error });
    return {
      category: null,
      error: error instanceof Error ? error.message : 'Failed to create category',
    };
  }
}

/**
 * Update a category
 */
export async function updateCategory(parameters: {
  currentUserId: string;
  categoryId: string;
  updates: Partial<Category>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase
      .from('categories')
      .update({
        ...parameters.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parameters.categoryId);

    if (error) {
      logger.error('Error updating category', { errorDetails: error });
      return { success: false, error: 'Failed to update category' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'update_category',
      targetType: 'category',
      targetId: parameters.categoryId,
      details: { updates: parameters.updates },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateCategory', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update category',
    };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(parameters: {
  currentUserId: string;
  categoryId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    const { error } = await supabase.from('categories').delete().eq('id', parameters.categoryId);

    if (error) {
      logger.error('Error deleting category', { errorDetails: error });
      return { success: false, error: 'Failed to delete category' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'delete_category',
      targetType: 'category',
      targetId: parameters.categoryId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deleteCategory', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete category',
    };
  }
}

/**
 * Reorder categories
 */
export async function reorderCategories(parameters: {
  currentUserId: string;
  categoryOrders: { id: string; display_order: number }[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    // Update each category's display order
    for (const { id, display_order } of parameters.categoryOrders) {
      await supabase.from('categories').update({ display_order }).eq('id', id);
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'reorder_categories',
      targetType: 'category',
      details: { count: parameters.categoryOrders.length },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in reorderCategories', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder categories',
    };
  }
}

/**
 * Get all tags with statistics
 */
export async function getTags(parameters: {
  currentUserId: string;
  search?: string;
  sortBy?: 'name' | 'post_count' | 'follower_count';
  page?: number;
  limit?: number;
}): Promise<{ tags: Tag[]; total: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const page = parameters.page ?? 1;
    const limit = parameters.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase.from('tags').select('*', { count: 'exact' });

    if (parameters.search) {
      query = query.or(`name.ilike.%${parameters.search}%,description.ilike.%${parameters.search}%`);
    }

    const sortBy = parameters.sortBy ?? 'name';
    query = query.order(sortBy, { ascending: sortBy === 'name' });

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching tags', { errorDetails: error });
      return { tags: [], total: 0, error: 'Failed to fetch tags' };
    }

    return {
      tags: (data as Tag[]) ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getTags', { errorDetails: error });
    return {
      tags: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch tags',
    };
  }
}

/**
 * Create a new tag
 */
export async function createTag(parameters: {
  currentUserId: string;
  name: string;
  slug: string;
  description: string;
}): Promise<{ tag: Tag | null; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: parameters.name,
        slug: parameters.slug,
        description: parameters.description,
        follower_count: 0,
        post_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating tag', { errorDetails: error });
      return { tag: null, error: 'Failed to create tag' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'create_tag',
      targetType: 'tag',
      targetId: data.id,
      details: { name: parameters.name, slug: parameters.slug },
    });

    return { tag: data as Tag };
  } catch (error) {
    logger.error('Exception in createTag', { errorDetails: error });
    return {
      tag: null,
      error: error instanceof Error ? error.message : 'Failed to create tag',
    };
  }
}

/**
 * Update a tag
 */
export async function updateTag(parameters: {
  currentUserId: string;
  tagId: string;
  updates: Partial<Tag>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase.from('tags').update(parameters.updates).eq('id', parameters.tagId);

    if (error) {
      logger.error('Error updating tag', { errorDetails: error });
      return { success: false, error: 'Failed to update tag' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'update_tag',
      targetType: 'tag',
      targetId: parameters.tagId,
      details: { updates: parameters.updates },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateTag', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tag',
    };
  }
}

/**
 * Merge tags (combine two tags into one)
 */
export async function mergeTags(parameters: {
  currentUserId: string;
  sourceTagId: string;
  targetTagId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    // Update all post_tags that reference source tag to point to target tag
    const { error: updateError } = await supabase
      .from('post_tags')
      .update({ tag_id: parameters.targetTagId })
      .eq('tag_id', parameters.sourceTagId);

    if (updateError) {
      logger.error('Error updating post_tags during merge', { error: updateError });
      return { success: false, error: 'Failed to merge tags' };
    }

    // Update all tag_follows that reference source tag
    await supabase
      .from('tag_follows')
      .update({ tag_id: parameters.targetTagId })
      .eq('tag_id', parameters.sourceTagId);

    // Delete the source tag
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', parameters.sourceTagId);

    if (deleteError) {
      logger.error('Error deleting source tag during merge', { error: deleteError });
      return { success: false, error: 'Failed to delete source tag' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'merge_tags',
      targetType: 'tag',
      targetId: parameters.targetTagId,
      details: { sourceTagId: parameters.sourceTagId },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in mergeTags', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to merge tags',
    };
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(parameters: {
  currentUserId: string;
  tagId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase.from('tags').delete().eq('id', parameters.tagId);

    if (error) {
      logger.error('Error deleting tag', { errorDetails: error });
      return { success: false, error: 'Failed to delete tag' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'delete_tag',
      targetType: 'tag',
      targetId: parameters.tagId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deleteTag', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tag',
    };
  }
}

/**
 * Clean up unused tags (tags with no posts)
 */
export async function cleanupUnusedTags(parameters: {
  currentUserId: string;
}): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    // Get tags with post_count = 0
    const { data: unusedTags } = await supabase
      .from('tags')
      .select('id')
      .eq('post_count', 0);

    if (!unusedTags || unusedTags.length === 0) {
      return { success: true, deleted: 0 };
    }

    const tagIds = unusedTags.map((t) => t.id);

    const { error } = await supabase.from('tags').delete().in('id', tagIds);

    if (error) {
      logger.error('Error cleaning up unused tags', { errorDetails: error });
      return { success: false, deleted: 0, error: 'Failed to clean up tags' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'cleanup_unused_tags',
      targetType: 'tag',
      details: { deletedCount: tagIds.length },
    });

    return { success: true, deleted: tagIds.length };
  } catch (error) {
    logger.error('Exception in cleanupUnusedTags', { errorDetails: error });
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Failed to clean up tags',
    };
  }
}

/**
 * Get featured tags from system settings
 */
export async function getFeaturedTags(parameters: {
  currentUserId: string;
}): Promise<{ tags: string[]; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'featured_tags')
      .single();

    if (error) {
      logger.error('Error fetching featured tags', { errorDetails: error });
      return { tags: [], error: 'Failed to fetch featured tags' };
    }

    const settingValue = data?.value as FeaturedTagsSetting | null;
    const tags = settingValue?.tags || [];
    return { tags };
  } catch (error) {
    logger.error('Exception in getFeaturedTags', { errorDetails: error });
    return {
      tags: [],
      error: error instanceof Error ? error.message : 'Failed to fetch featured tags',
    };
  }
}

/**
 * Update featured tags
 */
export async function updateFeaturedTags(parameters: {
  currentUserId: string;
  tagSlugs: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase
      .from('system_settings')
      .update({
        value: { tags: parameters.tagSlugs },
        updated_by: parameters.currentUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'featured_tags');

    if (error) {
      logger.error('Error updating featured tags', { errorDetails: error });
      return { success: false, error: 'Failed to update featured tags' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'update_featured_tags',
      targetType: 'setting',
      details: { tags: parameters.tagSlugs },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateFeaturedTags', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update featured tags',
    };
  }
}
