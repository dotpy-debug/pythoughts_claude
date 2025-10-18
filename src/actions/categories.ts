import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Category } from '../lib/supabase';

/**
 * Get all active categories for public use
 */
export async function getActiveCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Error fetching active categories', { error });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getActiveCategories', { error });
    return [];
  }
}

/**
 * Get all categories (admin only)
 */
export async function getAllCategories(userId: string): Promise<Category[]> {
  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized access to getAllCategories', { userId });
      return [];
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Error fetching all categories', { error });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getAllCategories', { error });
    return [];
  }
}

/**
 * Create a new category (admin only)
 */
export async function createCategory(
  userId: string,
  category: {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    icon?: string;
    display_order?: number;
  }
): Promise<{ success: boolean; error?: string; category?: Category }> {
  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized category creation attempt', { userId });
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Validate color format
    if (category.color && !/^#[0-9A-Fa-f]{6}$/.test(category.color)) {
      return { success: false, error: 'Invalid color format. Use hex format (#RRGGBB)' };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        color: category.color || '#6b7280',
        icon: category.icon || '📁',
        display_order: category.display_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating category', { error, category });
      if (error.code === '23505') {
        return { success: false, error: 'Category name or slug already exists' };
      }
      return { success: false, error: 'Failed to create category' };
    }

    logger.info('Category created successfully', { categoryId: data.id, userId });
    return { success: true, category: data };
  } catch (error) {
    logger.error('Unexpected error in createCategory', { error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing category (admin only)
 */
export async function updateCategory(
  userId: string,
  categoryId: string,
  updates: Partial<{
    name: string;
    slug: string;
    description: string;
    color: string;
    icon: string;
    is_active: boolean;
    display_order: number;
  }>
): Promise<{ success: boolean; error?: string; category?: Category }> {
  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized category update attempt', { userId, categoryId });
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Validate color format if provided
    if (updates.color && !/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
      return { success: false, error: 'Invalid color format. Use hex format (#RRGGBB)' };
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating category', { error, categoryId, updates });
      if (error.code === '23505') {
        return { success: false, error: 'Category name or slug already exists' };
      }
      return { success: false, error: 'Failed to update category' };
    }

    logger.info('Category updated successfully', { categoryId, userId });
    return { success: true, category: data };
  } catch (error) {
    logger.error('Unexpected error in updateCategory', { error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a category (admin only)
 * Note: This will remove the category reference from all posts
 */
export async function deleteCategory(
  userId: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized category deletion attempt', { userId, categoryId });
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get category slug to clear posts
    const { data: category } = await supabase
      .from('categories')
      .select('slug, post_count')
      .eq('id', categoryId)
      .single();

    if (category && category.post_count > 0) {
      // Clear category from posts that use it
      await supabase
        .from('posts')
        .update({ category: '' })
        .eq('category', category.slug);
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      logger.error('Error deleting category', { error, categoryId });
      return { success: false, error: 'Failed to delete category' };
    }

    logger.info('Category deleted successfully', { categoryId, userId });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in deleteCategory', { error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reorder categories (admin only)
 */
export async function reorderCategories(
  userId: string,
  categoryOrders: { id: string; display_order: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized category reorder attempt', { userId });
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update each category's display_order
    for (const { id, display_order } of categoryOrders) {
      await supabase
        .from('categories')
        .update({ display_order })
        .eq('id', id);
    }

    logger.info('Categories reordered successfully', { userId, count: categoryOrders.length });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in reorderCategories', { error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
