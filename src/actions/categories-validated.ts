/**
 * Category Server Actions with Zod Validation
 *
 * This module provides validated server actions for category operations.
 * All inputs are validated using Zod schemas before processing.
 *
 * @module actions/categories-validated
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { validateSchema } from '../lib/validation';
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  getAllCategoriesSchema,
  reorderCategoriesSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '../schemas/categories';
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
      logger.error('Error fetching active categories', error as Error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getActiveCategories', error as Error);
    return [];
  }
}

/**
 * Get all categories (admin only)
 */
export async function getAllCategories(userId: string): Promise<Category[]> {
  // Validate input
  const validation = validateSchema(getAllCategoriesSchema, { userId });

  if (!validation.success) {
    logger.warn('Invalid input for getAllCategories', { errors: validation.errors });
    return [];
  }

  const { userId: validatedUserId } = validation.data;

  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', validatedUserId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized access to getAllCategories', { userId: validatedUserId });
      return [];
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Error fetching all categories', error as Error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getAllCategories', error as Error);
    return [];
  }
}

/**
 * Create a new category (admin only)
 */
export async function createCategory(
  userId: string,
  category: CreateCategoryInput
): Promise<{ success: boolean; error?: string; category?: Category; errors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateSchema(createCategorySchema, category);

  if (!validation.success) {
    logger.warn('Invalid input for createCategory', { errors: validation.errors });
    return { success: false, error: 'Invalid input', errors: validation.errors };
  }

  const validatedCategory = validation.data;

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

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: validatedCategory.name,
        slug: validatedCategory.slug,
        description: validatedCategory.description || '',
        color: validatedCategory.color,
        icon: validatedCategory.icon,
        display_order: validatedCategory.display_order,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating category', error as Error, { category: validatedCategory });
      if (error.code === '23505') {
        return { success: false, error: 'Category name or slug already exists' };
      }
      return { success: false, error: 'Failed to create category' };
    }

    logger.info('Category created successfully', { categoryId: data.id, userId });
    return { success: true, category: data };
  } catch (error) {
    logger.error('Unexpected error in createCategory', error as Error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing category (admin only)
 */
export async function updateCategory(
  userId: string,
  categoryUpdate: UpdateCategoryInput
): Promise<{ success: boolean; error?: string; category?: Category; errors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateSchema(updateCategorySchema, categoryUpdate);

  if (!validation.success) {
    logger.warn('Invalid input for updateCategory', { errors: validation.errors });
    return { success: false, error: 'Invalid input', errors: validation.errors };
  }

  const { id: categoryId, ...updates } = validation.data;

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

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating category', error as Error, { categoryId, updates });
      if (error.code === '23505') {
        return { success: false, error: 'Category name or slug already exists' };
      }
      return { success: false, error: 'Failed to update category' };
    }

    logger.info('Category updated successfully', { categoryId, userId });
    return { success: true, category: data };
  } catch (error) {
    logger.error('Unexpected error in updateCategory', error as Error);
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
): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateSchema(deleteCategorySchema, { id: categoryId });

  if (!validation.success) {
    logger.warn('Invalid input for deleteCategory', { errors: validation.errors });
    return { success: false, error: 'Invalid input', errors: validation.errors };
  }

  const { id: validatedCategoryId } = validation.data;

  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized category deletion attempt', { userId, categoryId: validatedCategoryId });
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get category slug to clear posts
    const { data: category } = await supabase
      .from('categories')
      .select('slug, post_count')
      .eq('id', validatedCategoryId)
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
      .eq('id', validatedCategoryId);

    if (error) {
      logger.error('Error deleting category', error as Error, { categoryId: validatedCategoryId });
      return { success: false, error: 'Failed to delete category' };
    }

    logger.info('Category deleted successfully', { categoryId: validatedCategoryId, userId });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in deleteCategory', error as Error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reorder categories (admin only)
 */
export async function reorderCategories(
  userId: string,
  categoryOrders: { id: string; display_order: number }[]
): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateSchema(reorderCategoriesSchema, { userId, categoryOrders });

  if (!validation.success) {
    logger.warn('Invalid input for reorderCategories', { errors: validation.errors });
    return { success: false, error: 'Invalid input', errors: validation.errors };
  }

  const { userId: validatedUserId, categoryOrders: validatedOrders } = validation.data;

  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', validatedUserId)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('Unauthorized category reorder attempt', { userId: validatedUserId });
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update each category's display_order
    for (const { id, display_order } of validatedOrders) {
      await supabase
        .from('categories')
        .update({ display_order })
        .eq('id', id);
    }

    logger.info('Categories reordered successfully', { userId: validatedUserId, count: validatedOrders.length });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in reorderCategories', error as Error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
