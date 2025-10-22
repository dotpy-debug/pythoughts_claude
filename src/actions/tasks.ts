import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { Task, TaskComment, TaskActivity } from '../lib/supabase';

export type TaskWithDetails = Task & {
  comment_count?: number;
  activity_count?: number;
  task_comments?: TaskComment[];
  task_activity?: TaskActivity[];
};

export type TaskFilters = {
  status?: string[];
  priority?: string[];
  assignee_id?: string[];
  creator_id?: string;
  tags?: string[];
  has_due_date?: boolean;
  overdue?: boolean;
  search?: string;
};

/**
 * Get all tasks with optional filtering
 */
export async function getTasks(filters?: TaskFilters): Promise<TaskWithDetails[]> {
  try {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        profiles!tasks_creator_id_fkey (
          id,
          username,
          avatar_url
        ),
        assignee:profiles!tasks_assignee_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters?.assignee_id && filters.assignee_id.length > 0) {
      query = query.in('assignee_id', filters.assignee_id);
    }

    if (filters?.creator_id) {
      query = query.eq('creator_id', filters.creator_id);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.has_due_date !== undefined) {
      if (filters.has_due_date) {
        query = query.not('due_date', 'is', null);
      } else {
        query = query.is('due_date', null);
      }
    }

    if (filters?.overdue) {
      query = query.lt('due_date', new Date().toISOString());
      query = query.neq('status', 'completed');
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching tasks', error as Error, { filters });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getTasks', error as Error, { filters });
    return [];
  }
}

/**
 * Get a single task with full details
 */
export async function getTask(taskId: string): Promise<TaskWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        profiles!tasks_creator_id_fkey (
          id,
          username,
          avatar_url
        ),
        assignee:profiles!tasks_assignee_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      logger.error('Error fetching task', error as Error, { taskId });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Unexpected error in getTask', error as Error, { taskId });
    return null;
  }
}

/**
 * Create a new task
 */
export async function createTask(
  task: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string | null;
    assignee_id?: string | null;
    tags?: string[];
  },
  userId: string
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        creator_id: userId,
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        tags: task.tags || [],
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating task', error as Error, { task });
      return { success: false, error: 'Failed to create task' };
    }

    return { success: true, task: data };
  } catch (error) {
    logger.error('Unexpected error in createTask', error as Error, { task });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  userId: string
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    // Verify user has permission
    const { data: existing } = await supabase
      .from('tasks')
      .select('creator_id, assignee_id')
      .eq('id', taskId)
      .single();

    if (!existing) {
      return { success: false, error: 'Task not found' };
    }

    if (existing.creator_id !== userId && existing.assignee_id !== userId) {
      return { success: false, error: 'Unauthorized: You can only update tasks you created or are assigned to' };
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating task', error as Error, { taskId, updates });
      return { success: false, error: 'Failed to update task' };
    }

    return { success: true, task: data };
  } catch (error) {
    logger.error('Unexpected error in updateTask', error as Error, { taskId, updates });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user is the creator
    const { data: existing } = await supabase
      .from('tasks')
      .select('creator_id')
      .eq('id', taskId)
      .single();

    if (!existing) {
      return { success: false, error: 'Task not found' };
    }

    if (existing.creator_id !== userId) {
      return { success: false, error: 'Unauthorized: Only the task creator can delete tasks' };
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      logger.error('Error deleting task', error as Error, { taskId });
      return { success: false, error: 'Failed to delete task' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in deleteTask', error as Error, { taskId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Assign a task to a user
 */
export async function assignTask(
  taskId: string,
  assigneeId: string | null,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await updateTask(taskId, { assignee_id: assigneeId }, userId);

    if (!result.success) {
      return result;
    }

    // Create notification if assigning to someone
    if (assigneeId && assigneeId !== userId) {
      await supabase.from('notifications').insert({
        recipient_id: assigneeId,
        sender_id: userId,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned a new task`,
        target_id: taskId,
        target_type: 'task',
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in assignTask', error as Error, { taskId, assigneeId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get task comments
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching task comments', error as Error, { taskId });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getTaskComments', error as Error, { taskId });
    return [];
  }
}

/**
 * Create a task comment
 */
export async function createTaskComment(
  taskId: string,
  content: string,
  userId: string
): Promise<{ success: boolean; comment?: TaskComment; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        content,
        author_id: userId,
      })
      .select(`
        *,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating task comment', error as Error, { taskId, content });
      return { success: false, error: 'Failed to create comment' };
    }

    return { success: true, comment: data };
  } catch (error) {
    logger.error('Unexpected error in createTaskComment', error as Error, { taskId, content });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get task activity log
 */
export async function getTaskActivity(taskId: string): Promise<TaskActivity[]> {
  try {
    const { data, error } = await supabase
      .from('task_activity_log')
      .select(`
        *,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching task activity', error as Error, { taskId });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getTaskActivity', error as Error, { taskId });
    return [];
  }
}

/**
 * Get tasks grouped by status (for kanban board)
 */
export async function getTasksByStatus(filters?: Omit<TaskFilters, 'status'>): Promise<Record<string, TaskWithDetails[]>> {
  try {
    const tasks = await getTasks(filters);

    const grouped = {
      todo: [] as TaskWithDetails[],
      in_progress: [] as TaskWithDetails[],
      completed: [] as TaskWithDetails[],
      archived: [] as TaskWithDetails[],
    };

    tasks.forEach(task => {
      if (task.status in grouped) {
        grouped[task.status as keyof typeof grouped].push(task);
      }
    });

    return grouped;
  } catch (error) {
    logger.error('Unexpected error in getTasksByStatus', error as Error, { filters });
    return { todo: [], in_progress: [], completed: [], archived: [] };
  }
}

/**
 * Get task statistics
 */
export async function getTaskStats(userId?: string): Promise<{
  total: number;
  todo: number;
  in_progress: number;
  completed: number;
  overdue: number;
}> {
  try {
    let query = supabase.from('tasks').select('status, due_date');

    if (userId) {
      query = query.or(`creator_id.eq.${userId},assignee_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching task stats', error as Error, { userId });
      return { total: 0, todo: 0, in_progress: 0, completed: 0, overdue: 0 };
    }

    const now = new Date();
    const stats = {
      total: data.length,
      todo: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    };

    data.forEach(task => {
      if (task.status === 'todo') stats.todo++;
      if (task.status === 'in_progress') stats.in_progress++;
      if (task.status === 'completed') stats.completed++;

      if (task.due_date && new Date(task.due_date) < now && task.status !== 'completed') {
        stats.overdue++;
      }
    });

    return stats;
  } catch (error) {
    logger.error('Unexpected error in getTaskStats', error as Error, { userId });
    return { total: 0, todo: 0, in_progress: 0, completed: 0, overdue: 0 };
  }
}
