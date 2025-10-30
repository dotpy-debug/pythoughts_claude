import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';
import { getTasksByStatus, updateTask } from '../../actions/tasks';
import type { TaskWithDetails, TaskFilters } from '../../actions/tasks';
import { useAuth } from '../../contexts/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard } from './KanbanTaskCard';
import { logger } from '../../lib/logger';

interface KanbanBoardProps {
  filters?: Omit<TaskFilters, 'status'>;
  onTaskClick?: (task: TaskWithDetails) => void;
  onCreateTask?: (status: string) => void;
}

export function KanbanBoard({ filters, onTaskClick, onCreateTask }: KanbanBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Record<string, TaskWithDetails[]>>({
    todo: [],
    in_progress: [],
    completed: [],
    archived: [],
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTasks();
  }, [filters]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasksByStatus(filters);
      setTasks(data);
    } catch (error) {
      logger.error('Error loading kanban tasks', { errorDetails: error });
    } finally {
      setLoading(false);
    }
  };

  const findContainer = (id: string): string | null => {
    if (id in tasks) {
      return id;
    }

    for (const [containerId, items] of Object.entries(tasks)) {
      if (items.find(item => item.id === id)) {
        return containerId;
      }
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) || (over.id as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setTasks(prev => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];

      const activeIndex = activeItems.findIndex(item => item.id === active.id);
      const overIndex = overItems.findIndex(item => item.id === over.id);

      let newIndex: number;
      if (over.id in prev) {
        newIndex = overItems.length;
      } else {
        const isBelowLastItem = over && overIndex === overItems.length - 1;
        const modifier = isBelowLastItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
      }

      return {
        ...prev,
        [activeContainer]: activeItems.filter(item => item.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) || (over.id as string);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    const activeIndex = tasks[activeContainer].findIndex(item => item.id === active.id);
    const overIndex = tasks[overContainer].findIndex(item => item.id === over.id);

    if (activeIndex !== overIndex && activeContainer === overContainer) {
      setTasks(prev => ({
        ...prev,
        [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
      }));
    }

    // Update task status if moved to different column
    if (activeContainer !== overContainer && user) {
      try {
        const task = tasks[activeContainer].find(t => t.id === active.id);
        if (task) {
          await updateTask(
            task.id,
            { status: overContainer as 'todo' | 'in_progress' | 'completed' | 'archived' },
            user.id
          );
        }
      } catch (error) {
        logger.error('Error updating task status', { errorDetails: error, taskId: active.id, newStatus: overContainer });
        // Revert on error
        await loadTasks();
      }
    }

    setActiveId(null);
  };

  const activeTask = activeId
    ? Object.values(tasks)
        .flat()
        .find(task => task.id === activeId)
    : null;

  const columns = [
    { id: 'todo', title: 'To Do', color: 'border-gray-600' },
    { id: 'in_progress', title: 'In Progress', color: 'border-blue-500' },
    { id: 'completed', title: 'Completed', color: 'border-green-500' },
    { id: 'archived', title: 'Archived', color: 'border-gray-700' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(column => (
          <SortableContext
            key={column.id}
            items={tasks[column.id].map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              id={column.id}
              title={column.title}
              count={tasks[column.id].length}
              color={column.color}
              onAddTask={onCreateTask ? () => onCreateTask(column.id) : undefined}
            >
              <div className="space-y-3 min-h-[200px]">
                {tasks[column.id].map(task => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.(task)}
                  />
                ))}
                {tasks[column.id].length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-sm font-mono">
                    No tasks
                  </div>
                )}
              </div>
            </KanbanColumn>
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-90">
            <KanbanTaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
